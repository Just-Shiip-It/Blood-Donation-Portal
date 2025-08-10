import { NextRequest } from 'next/server'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { bloodRequestSchema, bloodRequestFilterSchema } from '@/lib/validations/blood-request'
import {
    createBloodRequest,
    getBloodRequests,
    getFacilityBloodRequests
} from '@/lib/services/blood-request'
import { getHealthcareFacilityByEmail } from '@/lib/services/healthcare-facility'
import { ZodError } from 'zod'

/**
 * GET /api/requests - Get blood requests with filtering
 */
export async function GET(request: NextRequest) {
    try {
        // Require facility, admin, or system admin role
        const authResult = await requireRoles(['facility', 'admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)

        // Parse query parameters
        const filters = bloodRequestFilterSchema.parse({
            bloodType: searchParams.get('bloodType') || undefined,
            urgencyLevel: searchParams.get('urgencyLevel') || undefined,
            status: searchParams.get('status') || undefined,
            facilityId: searchParams.get('facilityId') || undefined,
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10')
        })

        let result

        // If user is a facility, only show their requests
        if (authResult.user!.role === 'facility') {
            // Get facility ID from user email
            const facility = await getHealthcareFacilityByEmail(authResult.user!.email)
            if (!facility) {
                return errorResponse('Facility profile not found', 404)
            }

            result = await getFacilityBloodRequests(facility.id, filters)
        } else {
            // Admin and system admin can see all requests
            result = await getBloodRequests(filters)
        }

        return successResponse(result)
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

        console.error('Get blood requests error:', error)
        return errorResponse('Failed to get blood requests', 500)
    }
}

/**
 * POST /api/requests - Create a new blood request
 */
export async function POST(request: NextRequest) {
    try {
        // Require facility role
        const authResult = await requireRoles(['facility'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()

        // Validate request body
        const validatedData = bloodRequestSchema.parse(body)

        // Get facility ID from user email
        const facility = await getHealthcareFacilityByEmail(authResult.user!.email)
        if (!facility) {
            return errorResponse('Facility profile not found', 404)
        }

        if (!facility.isActive) {
            return errorResponse('Facility account is inactive', 403)
        }

        // Create blood request
        const bloodRequest = await createBloodRequest(facility.id, validatedData)

        return successResponse(bloodRequest, 'Blood request created successfully')
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

        console.error('Create blood request error:', error)
        return errorResponse('Failed to create blood request', 500)
    }
}