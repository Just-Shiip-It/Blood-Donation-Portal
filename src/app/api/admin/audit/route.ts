import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { AuditService } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
    try {
        // Require system admin role for audit logs
        const authResult = await requireRoles(['system_admin'])

        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'audit'
        const userId = searchParams.get('userId')
        const action = searchParams.get('action')
        const resource = searchParams.get('resource')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const filters = {
            userId: userId || undefined,
            action: action || undefined,
            resource: resource || undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
            offset
        }

        switch (type) {
            case 'audit':
                const auditLogs = await AuditService.getAuditLogs(filters)
                return successResponse(auditLogs)

            case 'activity':
                const activityLogs = await AuditService.getActivityLogs(filters)
                return successResponse(activityLogs)

            case 'stats':
                const auditStats = await AuditService.getAuditStats(
                    filters.startDate,
                    filters.endDate
                )
                return successResponse(auditStats)

            case 'user-summary':
                if (!userId) {
                    return errorResponse('User ID is required for user summary', 400)
                }
                const days = parseInt(searchParams.get('days') || '30')
                const userSummary = await AuditService.getUserActivitySummary(userId, days)
                return successResponse(userSummary)

            default:
                return errorResponse('Invalid audit type', 400)
        }
    } catch (error) {
        console.error('Audit API error:', error)
        return errorResponse('Failed to fetch audit data', 500)
    }
}