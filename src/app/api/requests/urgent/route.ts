
import { successResponse, errorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { getUrgentBloodRequests } from '@/lib/services/blood-request'

/**
 * GET /api/requests/urgent - Get urgent blood requests (emergency and urgent)
 */
export async function GET() {
    try {
        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const urgentRequests = await getUrgentBloodRequests()

        return successResponse({
            requests: urgentRequests,
            count: urgentRequests.length
        })
    } catch (error) {
        console.error('Get urgent blood requests error:', error)
        return errorResponse('Failed to get urgent blood requests', 500)
    }
}