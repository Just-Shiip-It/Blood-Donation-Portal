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
        const reportType = searchParams.get('type') as 'donations' | 'appointments' | 'inventory' | 'users'
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const bloodBankId = searchParams.get('bloodBankId')
        const facilityId = searchParams.get('facilityId')

        if (!reportType || !['donations', 'appointments', 'inventory', 'users'].includes(reportType)) {
            return errorResponse('Valid report type is required (donations, appointments, inventory, users)', 400)
        }

        const filters = {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            bloodBankId: bloodBankId || undefined,
            facilityId: facilityId || undefined
        }

        const reportData = await AnalyticsService.getReportingData(reportType, filters)

        return successResponse({
            reportType,
            filters,
            data: reportData,
            generatedAt: new Date().toISOString()
        })
    } catch (error) {
        console.error('Reports API error:', error)
        return errorResponse('Failed to generate report', 500)
    }
}