import { db } from '@/lib/db'
import { auditLogSchema, activityLogSchema } from '@/lib/db/schema'
import { eq, desc, and, gte, lte, count } from 'drizzle-orm'

export interface AuditLogEntry {
    userId?: string
    action: string
    resource: string
    resourceId?: string
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
}

export interface ActivityLogEntry {
    userId?: string
    sessionId?: string
    action: string
    path?: string
    method?: string
    duration?: string
    statusCode?: string
    metadata?: Record<string, unknown>
}

export interface AuditLogFilters {
    userId?: string
    action?: string
    resource?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
}

export class AuditService {
    /**
     * Log an audit event
     */
    static async logAudit(entry: AuditLogEntry): Promise<void> {
        try {
            await db.insert(auditLogSchema).values({
                userId: entry.userId,
                action: entry.action,
                resource: entry.resource,
                resourceId: entry.resourceId,
                oldValues: entry.oldValues,
                newValues: entry.newValues,
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
                metadata: entry.metadata,
            })
        } catch (error) {
            console.error('Failed to log audit entry:', error)
            // Don't throw error to avoid breaking the main operation
        }
    }

    /**
     * Log an activity event
     */
    static async logActivity(entry: ActivityLogEntry): Promise<void> {
        try {
            await db.insert(activityLogSchema).values({
                userId: entry.userId,
                sessionId: entry.sessionId,
                action: entry.action,
                path: entry.path,
                method: entry.method,
                duration: entry.duration,
                statusCode: entry.statusCode,
                metadata: entry.metadata,
            })
        } catch (error) {
            console.error('Failed to log activity entry:', error)
            // Don't throw error to avoid breaking the main operation
        }
    }

    /**
     * Get audit logs with filtering
     */
    static async getAuditLogs(filters: AuditLogFilters = {}) {
        const conditions = []

        if (filters.userId) {
            conditions.push(eq(auditLogSchema.userId, filters.userId))
        }
        if (filters.action) {
            conditions.push(eq(auditLogSchema.action, filters.action))
        }
        if (filters.resource) {
            conditions.push(eq(auditLogSchema.resource, filters.resource))
        }
        if (filters.startDate) {
            conditions.push(gte(auditLogSchema.timestamp, filters.startDate))
        }
        if (filters.endDate) {
            conditions.push(lte(auditLogSchema.timestamp, filters.endDate))
        }

        const query = db
            .select()
            .from(auditLogSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(auditLogSchema.timestamp))
            .limit(filters.limit || 100)
            .offset(filters.offset || 0)

        return await query
    }

    /**
     * Get activity logs with filtering
     */
    static async getActivityLogs(filters: AuditLogFilters = {}) {
        const conditions = []

        if (filters.userId) {
            conditions.push(eq(activityLogSchema.userId, filters.userId))
        }
        if (filters.action) {
            conditions.push(eq(activityLogSchema.action, filters.action))
        }
        if (filters.startDate) {
            conditions.push(gte(activityLogSchema.timestamp, filters.startDate))
        }
        if (filters.endDate) {
            conditions.push(lte(activityLogSchema.timestamp, filters.endDate))
        }

        const query = db
            .select()
            .from(activityLogSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(activityLogSchema.timestamp))
            .limit(filters.limit || 100)
            .offset(filters.offset || 0)

        return await query
    }

    /**
     * Get audit statistics
     */
    static async getAuditStats(startDate?: Date, endDate?: Date) {
        const conditions = []

        if (startDate) {
            conditions.push(gte(auditLogSchema.timestamp, startDate))
        }
        if (endDate) {
            conditions.push(lte(auditLogSchema.timestamp, endDate))
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined

        // Get action counts
        const actionStats = await db
            .select({
                action: auditLogSchema.action,
                count: count()
            })
            .from(auditLogSchema)
            .where(whereClause)
            .groupBy(auditLogSchema.action)

        // Get resource counts
        const resourceStats = await db
            .select({
                resource: auditLogSchema.resource,
                count: count()
            })
            .from(auditLogSchema)
            .where(whereClause)
            .groupBy(auditLogSchema.resource)

        // Get total count
        const totalCount = await db
            .select({ count: count() })
            .from(auditLogSchema)
            .where(whereClause)

        return {
            totalEvents: totalCount[0]?.count || 0,
            actionBreakdown: actionStats,
            resourceBreakdown: resourceStats
        }
    }

    /**
     * Get user activity summary
     */
    static async getUserActivitySummary(userId: string, days: number = 30) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const auditCount = await db
            .select({ count: count() })
            .from(auditLogSchema)
            .where(and(
                eq(auditLogSchema.userId, userId),
                gte(auditLogSchema.timestamp, startDate)
            ))

        const activityCount = await db
            .select({ count: count() })
            .from(activityLogSchema)
            .where(and(
                eq(activityLogSchema.userId, userId),
                gte(activityLogSchema.timestamp, startDate)
            ))

        const recentActions = await db
            .select({
                action: auditLogSchema.action,
                resource: auditLogSchema.resource,
                timestamp: auditLogSchema.timestamp
            })
            .from(auditLogSchema)
            .where(and(
                eq(auditLogSchema.userId, userId),
                gte(auditLogSchema.timestamp, startDate)
            ))
            .orderBy(desc(auditLogSchema.timestamp))
            .limit(10)

        return {
            auditEvents: auditCount[0]?.count || 0,
            activityEvents: activityCount[0]?.count || 0,
            recentActions
        }
    }
}