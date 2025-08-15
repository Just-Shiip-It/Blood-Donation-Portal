/**
 * Database query optimization utilities
 * Implements query optimization, indexing strategies, and connection pooling
 */

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

// Query optimization utilities
export class QueryOptimizer {
    // Batch queries to reduce database round trips
    static async batchQueries(queries: (() => Promise<unknown>)[]): Promise<unknown[]> {
        return Promise.all(queries.map(query => query()));
    }

    // Paginated query with optimized counting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async paginatedQuery(
        query: any,
        page: number = 1,
        limit: number = 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        countQuery?: any
    ) {
        const offset = (page - 1) * limit;

        // Execute data query with limit and offset
        const dataPromise = query.limit(limit).offset(offset);

        // Execute count query if provided, otherwise use approximate count
        const countPromise = countQuery
            ? countQuery
            : this.getApproximateCount(query);

        const [data, totalCount] = await Promise.all([dataPromise, countPromise]);

        return {
            data,
            pagination: {
                page,
                limit,
                totalCount: typeof totalCount === 'number' ? totalCount : totalCount[0]?.count || 0,
                totalPages: Math.ceil((typeof totalCount === 'number' ? totalCount : totalCount[0]?.count || 0) / limit),
                hasNext: page * limit < (typeof totalCount === 'number' ? totalCount : totalCount[0]?.count || 0),
                hasPrev: page > 1
            }
        };
    }

    // Get approximate count for large tables (faster than COUNT(*))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getApproximateCount(query: any) {
        try {
            // Use PostgreSQL's pg_stat_user_tables for approximate counts
            const result = await db.execute(sql`
        SELECT reltuples::BIGINT AS count 
        FROM pg_class 
        WHERE relname = 'appointments'
      `);
            const rows = result as unknown as { count: number }[];
            return rows[0]?.count || 0;
        } catch {
            // Fallback to exact count if approximate fails
            return query.count();
        }
    }

    // Optimize WHERE clauses with proper indexing hints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static optimizeWhereClause(conditions: Record<string, any>) {
        // Sort conditions by selectivity (most selective first)
        const sortedConditions = Object.entries(conditions)
            .sort(([, a], [, b]) => {
                // Prioritize equality conditions over range conditions
                if (typeof a === 'string' && typeof b !== 'string') return -1;
                if (typeof a !== 'string' && typeof b === 'string') return 1;
                return 0;
            });

        return Object.fromEntries(sortedConditions);
    }
}

// Database indexing strategies
export const DatabaseIndexes = {
    // Create performance-critical indexes
    async createPerformanceIndexes() {
        const indexes = [
            // Appointments table indexes
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_donor_date 
          ON appointments(donor_id, appointment_date)`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_blood_bank_date 
          ON appointments(blood_bank_id, appointment_date)`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_status_date 
          ON appointments(status, appointment_date)`,

            // Blood inventory indexes
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blood_inventory_type_bank 
          ON blood_inventory(blood_type, blood_bank_id)`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blood_inventory_threshold 
          ON blood_inventory(blood_bank_id) WHERE units_available <= minimum_threshold`,

            // Blood requests indexes
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blood_requests_urgency_date 
          ON blood_requests(urgency_level, request_date)`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blood_requests_type_status 
          ON blood_requests(blood_type, status)`,

            // Donor profiles indexes
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_donor_profiles_blood_type 
          ON donor_profiles(blood_type) WHERE NOT is_deferred_permanent`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_donor_profiles_last_donation 
          ON donor_profiles(last_donation_date) WHERE last_donation_date IS NOT NULL`,

            // Audit logs indexes (for compliance)
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp 
          ON audit_logs(timestamp DESC)`,
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action 
          ON audit_logs(user_id, action)`,

            // Notification indexes
            sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
          ON notifications(user_id, is_read, created_at DESC)`,
        ];

        // Execute indexes in parallel with error handling
        const results = await Promise.allSettled(
            indexes.map(index => db.execute(index))
        );

        const failed = results
            .map((result, i) => ({ result, index: i }))
            .filter(({ result }) => result.status === 'rejected');

        if (failed.length > 0) {
            console.warn(`Failed to create ${failed.length} indexes:`, failed);
        }

        return {
            created: results.length - failed.length,
            failed: failed.length
        };
    },

    // Analyze table statistics for query planner
    async analyzeTableStatistics() {
        const tables = [
            'appointments',
            'blood_inventory',
            'blood_requests',
            'donor_profiles',
            'blood_banks',
            'healthcare_facilities'
        ];

        await Promise.all(
            tables.map(table =>
                db.execute(sql.raw(`ANALYZE ${table}`))
            )
        );
    }
};

// Connection pooling optimization
export class ConnectionPoolOptimizer {
    private static instance: ConnectionPoolOptimizer;
    private connectionMetrics = {
        activeConnections: 0,
        totalQueries: 0,
        avgQueryTime: 0,
        slowQueries: 0
    };

    static getInstance() {
        if (!this.instance) {
            this.instance = new ConnectionPoolOptimizer();
        }
        return this.instance;
    }

    // Monitor query performance
    async executeWithMetrics<T>(queryFn: () => Promise<T>): Promise<T> {
        const startTime = Date.now();
        this.connectionMetrics.activeConnections++;

        try {
            const result = await queryFn();
            const duration = Date.now() - startTime;

            this.connectionMetrics.totalQueries++;
            this.connectionMetrics.avgQueryTime =
                (this.connectionMetrics.avgQueryTime + duration) / 2;

            if (duration > 1000) { // Slow query threshold: 1 second
                this.connectionMetrics.slowQueries++;
                console.warn(`Slow query detected: ${duration}ms`);
            }

            return result;
        } finally {
            this.connectionMetrics.activeConnections--;
        }
    }

    getMetrics() {
        return { ...this.connectionMetrics };
    }

    // Reset metrics (useful for testing)
    resetMetrics() {
        this.connectionMetrics = {
            activeConnections: 0,
            totalQueries: 0,
            avgQueryTime: 0,
            slowQueries: 0
        };
    }
}

// Query caching utilities
export class QueryCache {
    private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    static async get<T>(
        key: string,
        queryFn: () => Promise<T>,
        ttl: number = 300000 // 5 minutes default
    ): Promise<T> {
        const cached = this.cache.get(key);

        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }

        const data = await queryFn();
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });

        return data;
    }

    static invalidate(pattern?: string) {
        if (pattern) {
            // Invalidate keys matching pattern
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // Clear all cache
            this.cache.clear();
        }
    }

    static getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}