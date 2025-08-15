import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/errors/handlers'
import { validateRequest } from '@/lib/middleware/validation'
import { successResponse } from '@/lib/api/response'
import { AppError, ErrorCategory, ErrorSeverity, ERROR_CODES } from '@/lib/errors/types'

// Error report schema
const errorReportSchema = z.object({
    code: z.string().min(1, 'Error code is required'),
    message: z.string().min(1, 'Error message is required'),
    category: z.nativeEnum(ErrorCategory),
    severity: z.nativeEnum(ErrorSeverity),
    timestamp: z.string().datetime('Invalid timestamp format'),
    userId: z.string().uuid().optional(),
    requestId: z.string().optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    stack: z.string().optional(),
    userAgent: z.string().optional(),
    url: z.string().url().optional(),
    additionalContext: z.object({
        browserInfo: z.object({
            userAgent: z.string().optional(),
            language: z.string().optional(),
            platform: z.string().optional(),
            cookieEnabled: z.boolean().optional(),
            onLine: z.boolean().optional()
        }).optional(),
        screenInfo: z.object({
            width: z.number().optional(),
            height: z.number().optional(),
            colorDepth: z.number().optional()
        }).optional(),
        performanceInfo: z.object({
            memory: z.number().optional(),
            timing: z.record(z.string(), z.number()).optional()
        }).optional(),
        customData: z.record(z.string(), z.unknown()).optional(),
        serverInfo: z.object({
            ipAddress: z.string().optional(),
            timestamp: z.string().optional(),
            environment: z.string().optional()
        }).optional()
    }).optional()
})

type ErrorReport = z.infer<typeof errorReportSchema>

// In-memory error storage (in production, use a proper database or logging service)
const errorReports: ErrorReport[] = []
const MAX_STORED_ERRORS = 1000

async function storeErrorReport(report: ErrorReport): Promise<void> {
    // Add timestamp if not provided
    const enrichedReport = {
        ...report,
        timestamp: report.timestamp || new Date().toISOString(),
        requestId: report.requestId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Store in memory (replace with database in production)
    errorReports.push(enrichedReport)

    // Maintain storage limit
    if (errorReports.length > MAX_STORED_ERRORS) {
        errorReports.shift()
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
        console.error('Client Error Report:', enrichedReport)
    }

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
        await sendToMonitoringService(enrichedReport)
    }
}

async function sendToMonitoringService(report: ErrorReport): Promise<void> {
    try {
        // Example: Send to external monitoring service
        // Replace with your actual monitoring service (Sentry, LogRocket, etc.)

        if (process.env.MONITORING_SERVICE_URL) {
            await fetch(process.env.MONITORING_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.MONITORING_SERVICE_TOKEN}`
                },
                body: JSON.stringify(report)
            })
        }
    } catch (error) {
        console.error('Failed to send error report to monitoring service:', error)
        // Don't throw here to avoid recursive error reporting
    }
}

async function getErrorStatistics(): Promise<{
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    recentErrors: ErrorReport[]
}> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const recentErrors = errorReports.filter(
        error => new Date(error.timestamp) >= oneDayAgo
    )

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
        acc[category] = recentErrors.filter(error => error.category === category).length
        return acc
    }, {} as Record<ErrorCategory, number>)

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
        acc[severity] = recentErrors.filter(error => error.severity === severity).length
        return acc
    }, {} as Record<ErrorSeverity, number>)

    return {
        totalErrors: recentErrors.length,
        errorsByCategory,
        errorsBySeverity,
        recentErrors: recentErrors.slice(-10) // Last 10 errors
    }
}

// POST /api/errors/report - Report a client-side error
export const POST = withErrorHandler(async (req: NextRequest) => {
    try {
        // Validate request body
        const validateBody = validateRequest(errorReportSchema)
        const errorReport = await validateBody(req)

        // Extract additional context from request
        const userAgent = req.headers.get('user-agent') || undefined
        const referer = req.headers.get('referer') || undefined
        const ipAddress = req.headers.get('x-forwarded-for') ||
            req.headers.get('x-real-ip') ||
            'unknown'

        // Enrich error report with server-side context
        const enrichedReport: ErrorReport = {
            ...errorReport,
            userAgent: errorReport.userAgent || userAgent,
            url: errorReport.url || referer,
            additionalContext: {
                ...errorReport.additionalContext,
                serverInfo: {
                    ipAddress,
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV
                }
            }
        }

        // Store the error report
        await storeErrorReport(enrichedReport)

        return successResponse(
            {
                reportId: enrichedReport.requestId,
                message: 'Error report received successfully'
            },
            'Error report submitted successfully'
        )

    } catch (error) {
        console.error('Failed to process error report:', error)

        if (error instanceof AppError) {
            throw error
        }

        throw new AppError(
            'Failed to process error report',
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            ErrorCategory.SERVER_ERROR,
            ErrorSeverity.HIGH,
            { originalError: error instanceof Error ? error.message : String(error) }
        )
    }
})

// GET /api/errors/report - Get error statistics (admin only)
export const GET = withErrorHandler(async (req: NextRequest) => {
    try {
        // In a real application, add authentication and authorization here
        const userRole = req.headers.get('x-user-role')

        if (userRole !== 'system_admin') {
            throw new AppError(
                'Insufficient permissions to view error statistics',
                ERROR_CODES.INSUFFICIENT_PERMISSIONS,
                ErrorCategory.AUTHORIZATION,
                ErrorSeverity.MEDIUM
            )
        }

        const statistics = await getErrorStatistics()

        return successResponse(statistics, 'Error statistics retrieved successfully')

    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError(
            'Failed to retrieve error statistics',
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            ErrorCategory.SERVER_ERROR,
            ErrorSeverity.MEDIUM,
            { originalError: error instanceof Error ? error.message : String(error) }
        )
    }
})

// DELETE /api/errors/report - Clear error reports (admin only)
export const DELETE = withErrorHandler(async (req: NextRequest) => {
    try {
        // In a real application, add authentication and authorization here
        const userRole = req.headers.get('x-user-role')

        if (userRole !== 'system_admin') {
            throw new AppError(
                'Insufficient permissions to clear error reports',
                ERROR_CODES.INSUFFICIENT_PERMISSIONS,
                ErrorCategory.AUTHORIZATION,
                ErrorSeverity.MEDIUM
            )
        }

        const clearedCount = errorReports.length
        errorReports.length = 0 // Clear the array

        return successResponse(
            { clearedCount },
            `Cleared ${clearedCount} error reports`
        )

    } catch (error) {
        if (error instanceof AppError) {
            throw error
        }

        throw new AppError(
            'Failed to clear error reports',
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            ErrorCategory.SERVER_ERROR,
            ErrorSeverity.MEDIUM,
            { originalError: error instanceof Error ? error.message : String(error) }
        )
    }
})