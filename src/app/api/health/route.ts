import { NextResponse } from 'next/server'
import { testDatabaseConnection, checkDatabaseHealth } from '@/lib/db/connection'

export async function GET() {
    try {
        const dbConnection = await testDatabaseConnection()
        const dbHealth = await checkDatabaseHealth()

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: {
                connection: dbConnection,
                health: dbHealth
            },
            services: {
                api: 'healthy',
                database: dbConnection.success ? 'healthy' : 'unhealthy'
            }
        })
    } catch (error) {
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            services: {
                api: 'healthy',
                database: 'unhealthy'
            }
        }, { status: 500 })
    }
}