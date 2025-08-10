import { NextRequest } from 'next/server'
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { bloodRequestUpdateSchema } from '@/lib/validations/blood-request'
import {
    getBloodRequestById,
    updateBloodRequest,
    cancelBloodRequest
} from '@/lib/services/blood-request'
import { getHealthcareFacilityByEmail } from '@/lib/services/healthcare-facility'
import { ZodError } from 'zod'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/requests/[id] - Get blood request by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require facility, admin, or system admin role
        const authResult = await requireRoles(['facility', 'admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const bloodRequest = await getBloodRequestById(id)
        if (!bloodRequest) {
            return notFoundResponse('Blood request not found')
        }

        // If user is a facility, ensure they can only see their own requests
        if (authResult.user!.role === 'facility') {
            const facility = await getHealthcareFacilityByEmail(authResult.user!.email)
            if (!facility || facility.id !== bloodRequest.facilityId) {
                return errorResponse('Access denied', 403)
            }
        }

        return successResponse(bloodRequest)
    } catch (error) {
        console.error('Get blood request error:', error)
        return errorResponse('Failed to get blood request', 500)
    }
}

/**
 * PUT /api/requests/[id] - Update blood request
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require facility, admin, or system admin role
        const authResult = await requireRoles(['facility', 'admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()

        // Validate request body
        const validatedData = bloodRequestUpdateSchema.parse(body)

        // Get existing request
        const existingRequest = await getBloodRequestById(id)
        if (!existingRequest) {
            return notFoundResponse('Blood request not found')
        }

        // If user is a facility, ensure they can only update their own requests
        if (authResult.user!.role === 'facility') {
            const facility = await getHealthcareFacilityByEmail(authResult.user!.email)
            if (!facility || facility.id !== existingRequest.facilityId) {
                return errorResponse('Access denied', 403)
            }

            // Facilities can only update pending requests
            if (existingRequest.status !== 'pending') {
                return errorResponse('Cannot update non-pending requests', 400)
            }

            // Facilities cannot change status
            if (validatedData.status) {
                return errorResponse('Facilities cannot change request status', 403)
            }
        }

        // Update request
        const updatedRequest = await updateBloodRequest(id, validatedData)
        if (!updatedRequest) {
            return notFoundResponse('Blood request not found')
        }

        return successResponse(updatedRequest, 'Blood request updated successfully')
    } catch (error) {
        if (error instanceof ZodError) {
            const errors: Record<string, string[]> = {}
            error.issues.forEach((err) => {
                const path = err.path.join('.')
                if (!errors[path]) errors[path] = []
                errors[path].push(err.message)
            })
            return validationErrorResponse(errors)
        }

        console.error('Update blood request error:', error)
        return errorResponse('Failed to update blood request', 500)
    }
}

/**
 * DELETE /api/requests/[id] - Cancel blood request
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require facility, admin, or system admin role
        const authResult = await requireRoles(['facility', 'admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        // Get existing request
        const existingRequest = await getBloodRequestById(id)
        if (!existingRequest) {
            return notFoundResponse('Blood request not found')
        }

        // If user is a facility, ensure they can only cancel their own requests
        if (authResult.user!.role === 'facility') {
            const facility = await getHealthcareFacilityByEmail(authResult.user!.email)
            if (!facility || facility.id !== existingRequest.facilityId) {
                return errorResponse('Access denied', 403)
            }
        }

        // Can only cancel pending requests
        if (existingRequest.status !== 'pending') {
            return errorResponse('Cannot cancel non-pending requests', 400)
        }

        const body = await request.json().catch(() => ({}))
        const reason = body.reason || 'Cancelled by user'

        // Cancel request
        const cancelledRequest = await cancelBloodRequest(id, reason)
        if (!cancelledRequest) {
            return notFoundResponse('Blood request not found')
        }

        return successResponse(cancelledRequest, 'Blood request cancelled successfully')
    } catch (error) {
        console.error('Cancel blood request error:', error)
        return errorResponse('Failed to cancel blood request', 500)
    }
}