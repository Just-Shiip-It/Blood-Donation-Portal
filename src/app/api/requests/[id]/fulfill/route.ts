import { NextRequest } from 'next/server'
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { bloodRequestFulfillmentSchema } from '@/lib/validations/blood-request'
import {
    getBloodRequestById,
    fulfillBloodRequest
} from '@/lib/services/blood-request'
import { ZodError } from 'zod'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * POST /api/requests/[id]/fulfill - Fulfill a blood request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()

        // Validate request body
        const validatedData = bloodRequestFulfillmentSchema.parse(body)

        // Get existing request
        const existingRequest = await getBloodRequestById(id)
        if (!existingRequest) {
            return notFoundResponse('Blood request not found')
        }

        // Check if request can be fulfilled
        if (existingRequest.status !== 'pending') {
            return errorResponse('Request is not pending and cannot be fulfilled', 400)
        }

        // Validate units provided doesn't exceed units requested
        if (validatedData.unitsProvided > existingRequest.unitsRequested) {
            return errorResponse('Units provided cannot exceed units requested', 400)
        }

        // Fulfill request
        const fulfilledRequest = await fulfillBloodRequest(id, validatedData)
        if (!fulfilledRequest) {
            return errorResponse('Failed to fulfill blood request', 500)
        }

        return successResponse(fulfilledRequest, 'Blood request fulfilled successfully')
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

        console.error('Fulfill blood request error:', error)

        // Handle specific business logic errors
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('already processed')) {
                return errorResponse(error.message, 404)
            }
            if (error.message.includes('Insufficient inventory')) {
                return errorResponse(error.message, 400)
            }
        }

        return errorResponse('Failed to fulfill blood request', 500)
    }
}