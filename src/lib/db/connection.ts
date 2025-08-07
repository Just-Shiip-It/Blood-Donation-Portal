import { db } from './index'
import { sql } from 'drizzle-orm'

export interface DatabaseResult<T = unknown> {
    success: boolean
    message: string
    data?: T
    error?: string
}

export async function testDatabaseConnection(): Promise<DatabaseResult> {
    try {
        // Simple query to test connection
        await db.execute(sql`SELECT 1 as test`)
        return {
            success: true,
            message: 'Database connection successful'
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Database connection test failed:', errorMessage)
        return {
            success: false,
            message: 'Database connection failed',
            error: errorMessage
        }
    }
}

export async function checkDatabaseHealth(): Promise<DatabaseResult<{ version: string; uptime: string }>> {
    try {
        const versionResult = await db.execute(sql`SELECT version() as version`)
        const uptimeResult = await db.execute(sql`
            SELECT EXTRACT(EPOCH FROM (current_timestamp - pg_postmaster_start_time()))::text || ' seconds' as uptime
        `)

        const version = versionResult.rows[0]?.version || 'Unknown'
        const uptime = uptimeResult.rows[0]?.uptime || 'Unknown'

        return {
            success: true,
            message: 'Database is healthy',
            data: { version: String(version), uptime: String(uptime) }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Database health check failed:', errorMessage)
        return {
            success: false,
            message: 'Database health check failed',
            error: errorMessage
        }
    }
}

export async function checkTableExists(tableName: string): Promise<DatabaseResult<boolean>> {
    try {
        const result = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ${tableName}
            ) as exists
        `)

        const exists = Boolean(result.rows[0]?.exists) || false

        return {
            success: true,
            message: `Table ${tableName} ${exists ? 'exists' : 'does not exist'}`,
            data: exists
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to check if table ${tableName} exists:`, errorMessage)
        return {
            success: false,
            message: `Failed to check table ${tableName}`,
            error: errorMessage
        }
    }
}

export async function runMigrations(): Promise<DatabaseResult> {
    try {
        // This would typically use drizzle-kit migrate command
        // For now, we'll just check if migrations are needed
        const tablesResult = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `)

        const tableCount = tablesResult.rows.length

        return {
            success: true,
            message: `Database has ${tableCount} tables`,
            data: { tableCount }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Migration check failed:', errorMessage)
        return {
            success: false,
            message: 'Migration check failed',
            error: errorMessage
        }
    }
}

export class DatabaseError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: unknown
    ) {
        super(message)
        this.name = 'DatabaseError'
    }
}

export function handleDatabaseError(error: unknown): DatabaseError {
    if (error instanceof DatabaseError) {
        return error
    }

    if (error instanceof Error) {
        // Handle specific PostgreSQL error codes
        const pgError = error as Error & { code?: string; detail?: string }
        if (pgError.code) {
            switch (pgError.code) {
                case '23505': // unique_violation
                    return new DatabaseError('Duplicate entry found', 'DUPLICATE_ENTRY', pgError.detail)
                case '23503': // foreign_key_violation
                    return new DatabaseError('Referenced record not found', 'FOREIGN_KEY_VIOLATION', pgError.detail)
                case '23502': // not_null_violation
                    return new DatabaseError('Required field is missing', 'NOT_NULL_VIOLATION', pgError.detail)
                case '42P01': // undefined_table
                    return new DatabaseError('Table does not exist', 'UNDEFINED_TABLE', pgError.detail)
                default:
                    return new DatabaseError(pgError.message, pgError.code, pgError.detail)
            }
        }
        return new DatabaseError(error.message)
    }

    return new DatabaseError('Unknown database error')
}