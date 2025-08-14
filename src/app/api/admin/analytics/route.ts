import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { AnalyticsService } from '@/lib/services/analytics'

export async function GET(request: NextRequest) {
    try {
        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])

        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'dashboard'
        const days = parseInt(searchParams.get('days') || '30')
        const bloodBankId = searchParams.get('bloodBankId')

        switch (type) {
            case 'dashboard':
                const dashboardMetrics = await AnalyticsService.getDashboardMetrics()
                return successResponse(dashboardMetrics)

            case 'bloodbank':
                if (!bloodBankId) {
                    return errorResponse('Blood bank ID is required for blood bank analytics', 400)
                }
                const bloodBankMetrics = await AnalyticsService.getBloodBankMetrics(bloodBankId)
                return successResponse(bloodBankMetrics)

            case 'system':
                const systemAnalytics = await AnalyticsService.getSystemAnalytics(days)
                return successResponse(systemAnalytics)

            case 'users':
                const role = searchParams.get('role')
                const isActive = searchParams.get('isActive')
                const limit = parseInt(searchParams.get('limit') || '50')
                const offset = parseInt(searchParams.get('offset') || '0')

                const userManagementData = await AnalyticsService.getUserManagementData({
                    role: role || undefined,
                    isActive: isActive ? isActive === 'true' : undefined,
                    limit,
                    offset
                })
                return successResponse(userManagementData)

            default:
                return errorResponse('Invalid analytics type', 400)
        }
    } catch (error) {
        console.error('Analytics API error:', error)
        return errorResponse('Failed to fetch analytics data', 500)
    }
}