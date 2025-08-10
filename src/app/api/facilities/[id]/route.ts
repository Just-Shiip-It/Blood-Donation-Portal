import { NextRequest } from 'next/server'
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { healthcareFacilityUpdateSchema } from '@/lib/validations/healthcare-facility'
import {
    getHealthcareFacilityById,
    updateHealthcareFacility,
    deleteHealthcareFacility,
    checkHealthcareFacilityExists
} from '@/lib/services/healthcare-facility'
import { ZodError } from 'zod'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/facilities/[id] - Get healthcare facility by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require admin, system admin, or facility role
        const authResult = await requireRoles(['admin', 'system_admin', 'facility'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const facility = await getHealthcareFacilityById(id)
        if (!facility) {
            return notFoundResponse('Healthcare facility not found')
        }

        return successResponse(facility)
    } catch (error) {
        console.error('Get facility error:', error)
        return errorResponse('Failed to get healthcare facility', 500)
    }
}

/**
 * PUT /api/facilities/[id] - Update healthcare facility
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()

        // Validate request body
        const validatedData = healthcareFacilityUpdateSchema.parse(body)

        // Check if facility exists
        const existingFacility = await getHealthcareFacilityById(id)
        if (!existingFacility) {
            return notFoundResponse('Healthcare facility not found')
        }

        // Check for conflicts if email or license is being updated
        if (validatedData.email || validatedData.licenseNumber) {
            const existsCheck = await checkHealthcareFacilityExists(
                validatedData.email || existingFacility.email,
                validatedData.licenseNumber || existingFacility.licenseNumber,
                id
            )

            if (validatedData.email && existsCheck.emailExists) {
                return errorResponse('A facility with this email already exists', 409)
            }

            if (validatedData.licenseNumber && existsCheck.licenseExists) {
                return errorResponse('A facility with this license number already exists', 409)
            }
        }

        // Update facility
        const updatedFacility = await updateHealthcareFacility(id, validatedData)
        if (!updatedFacility) {
            return notFoundResponse('Healthcare facility not found')
        }

        return successResponse(updatedFacility, 'Healthcare facility updated successfully')
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

        console.error('Update facility error:', error)
        return errorResponse('Failed to update healthcare facility', 500)
    }
}

/**
 * DELETE /api/facilities/[id] - Delete healthcare facility (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require system admin role only
        const authResult = await requireRoles(['system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const success = await deleteHealthcareFacility(id)
        if (!success) {
            return notFoundResponse('Healthcare facility not found')
        }

        return successResponse(null, 'Healthcare facility deleted successfully')
    } catch (error) {
        console.error('Delete facility error:', error)
        return errorResponse('Failed to delete healthcare facility', 500)
    }
}