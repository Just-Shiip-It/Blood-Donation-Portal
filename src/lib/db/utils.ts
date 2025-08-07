import { sql } from 'drizzle-orm'
import { db } from './index'
import { DatabaseResult, handleDatabaseError } from './connection'

/**
 * Execute a raw SQL query with error handling
 */
export async function executeQuery<T = unknown>(
    query: string
): Promise<DatabaseResult<T[]>> {
    try {
        const result = await db.execute(sql.raw(query))
        return {
            success: true,
            message: 'Query executed successfully',
            data: result.rows as T[]
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Query execution failed',
            error: dbError.message
        }
    }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseResult<{
    tables: Array<{ name: string; rowCount: number }>
    totalRows: number
}>> {
    try {
        // Get all table names
        const tablesResult = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `)

        const tables = []
        let totalRows = 0

        // Get row count for each table
        for (const table of tablesResult.rows) {
            const tableName = table.table_name as string
            try {
                const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`))
                const rowCount = parseInt(countResult.rows[0]?.count as string) || 0
                tables.push({ name: tableName, rowCount })
                totalRows += rowCount
            } catch {
                // If we can't get count for a table, add it with 0 count
                tables.push({ name: tableName, rowCount: 0 })
            }
        }

        return {
            success: true,
            message: 'Database statistics retrieved successfully',
            data: { tables, totalRows }
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Failed to retrieve database statistics',
            error: dbError.message
        }
    }
}

/**
 * Check if database is empty
 */
export async function isDatabaseEmpty(): Promise<DatabaseResult<boolean>> {
    try {
        const statsResult = await getDatabaseStats()
        if (!statsResult.success) {
            return {
                success: false,
                message: 'Failed to check if database is empty',
                error: statsResult.error
            }
        }

        const isEmpty = statsResult.data?.totalRows === 0

        return {
            success: true,
            message: `Database is ${isEmpty ? 'empty' : 'not empty'}`,
            data: isEmpty
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Failed to check if database is empty',
            error: dbError.message
        }
    }
}

/**
 * Validate database schema integrity
 */
export async function validateSchema(): Promise<DatabaseResult<{
    valid: boolean
    issues: string[]
}>> {
    try {
        const issues: string[] = []

        // Check if all expected tables exist
        const expectedTables = [
            'users',
            'donor_profiles',
            'blood_banks',
            'blood_inventory',
            'healthcare_facilities',
            'appointments',
            'blood_requests',
            'donation_history'
        ]

        const tablesResult = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `)

        const existingTables = tablesResult.rows.map(row => row.table_name as string)

        for (const expectedTable of expectedTables) {
            if (!existingTables.includes(expectedTable)) {
                issues.push(`Missing table: ${expectedTable}`)
            }
        }

        // Check for foreign key constraints
        const constraintsResult = await db.execute(sql`
            SELECT 
                tc.table_name,
                tc.constraint_name,
                tc.constraint_type
            FROM information_schema.table_constraints tc
            WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
        `)

        const foreignKeys = constraintsResult.rows.length
        if (foreignKeys < 5) { // We expect at least 5 foreign key relationships
            issues.push(`Expected more foreign key constraints, found: ${foreignKeys}`)
        }

        return {
            success: true,
            message: `Schema validation completed with ${issues.length} issues`,
            data: {
                valid: issues.length === 0,
                issues
            }
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Schema validation failed',
            error: dbError.message
        }
    }
}

/**
 * Create database indexes for better performance
 */
export async function createIndexes(): Promise<DatabaseResult> {
    try {
        const indexes = [
            // User indexes
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',

            // Donor profile indexes
            'CREATE INDEX IF NOT EXISTS idx_donor_profiles_user_id ON donor_profiles(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_donor_profiles_blood_type ON donor_profiles(blood_type)',
            'CREATE INDEX IF NOT EXISTS idx_donor_profiles_last_donation ON donor_profiles(last_donation_date)',

            // Blood bank indexes
            'CREATE INDEX IF NOT EXISTS idx_blood_banks_active ON blood_banks(is_active)',

            // Blood inventory indexes
            'CREATE INDEX IF NOT EXISTS idx_blood_inventory_bank_type ON blood_inventory(blood_bank_id, blood_type)',
            'CREATE INDEX IF NOT EXISTS idx_blood_inventory_expiration ON blood_inventory(expiration_date)',

            // Appointment indexes
            'CREATE INDEX IF NOT EXISTS idx_appointments_donor ON appointments(donor_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_blood_bank ON appointments(blood_bank_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',

            // Blood request indexes
            'CREATE INDEX IF NOT EXISTS idx_blood_requests_facility ON blood_requests(facility_id)',
            'CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON blood_requests(status)',
            'CREATE INDEX IF NOT EXISTS idx_blood_requests_urgency ON blood_requests(urgency_level)',
            'CREATE INDEX IF NOT EXISTS idx_blood_requests_required_by ON blood_requests(required_by)',

            // Donation history indexes
            'CREATE INDEX IF NOT EXISTS idx_donation_history_donor ON donation_history(donor_id)',
            'CREATE INDEX IF NOT EXISTS idx_donation_history_date ON donation_history(donation_date)',
            'CREATE INDEX IF NOT EXISTS idx_donation_history_blood_type ON donation_history(blood_type)'
        ]

        for (const indexQuery of indexes) {
            await db.execute(sql.raw(indexQuery))
        }

        return {
            success: true,
            message: `Created ${indexes.length} database indexes successfully`
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Failed to create database indexes',
            error: dbError.message
        }
    }
}

/**
 * Backup database data to JSON
 */
export async function backupData(): Promise<DatabaseResult<Record<string, unknown>>> {
    try {
        const backup: Record<string, unknown> = {}

        // Get all tables and their data
        const tables = [
            'users',
            'donor_profiles',
            'blood_banks',
            'blood_inventory',
            'healthcare_facilities',
            'appointments',
            'blood_requests',
            'donation_history'
        ]

        for (const table of tables) {
            const result = await db.execute(sql.raw(`SELECT * FROM "${table}"`))
            backup[table] = result.rows
        }

        backup.timestamp = new Date().toISOString()
        backup.version = '1.0.0'

        return {
            success: true,
            message: 'Database backup created successfully',
            data: backup
        }
    } catch (error) {
        const dbError = handleDatabaseError(error)
        return {
            success: false,
            message: 'Database backup failed',
            error: dbError.message
        }
    }
}