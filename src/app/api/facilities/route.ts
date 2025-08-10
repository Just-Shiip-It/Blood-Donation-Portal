import { NextRequest } from 'next/server'
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { healthcareFacilityRegistrationSchema } from '@/lib/validations/healthcare-facility'
import {
    createHealthcareFacility,
    getHealthcareFacilities,
    checkHealthcareFacilityExists
} from '@/lib/services/healthcare-facility'
import { ZodError } from 'zod'

/**
 * GET /api/facilities - Get all healthcare facilities
 */
export async function GET(request: NextRequest) {
    try {
        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)
        const facilityType = searchParams.get('facilityType') || undefined
        const isActive = searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined
        const search = searchParams.get('search') || undefined
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')

        const result = await getHealthcareFacilities({
            facilityType,
            isActive,
            search,
            page,
            limit
        })

        return successResponse(result)
    } catch (error) {
        console.error('Get facilities error:', error)
        return errorResponse('Failed to get healthcare facilities', 500)
    }
}

/**
 * POST /api/facilities - Create a new healthcare facility
 */
export async function POST(request: NextRequest) {
    try {
        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()

        // Validate request body
        const validatedData = healthcareFacilityRegistrationSchema.parse(body)

        // Check if facility already exists
        const existsCheck = await checkHealthcareFacilityExists(
            validatedData.email,
            validatedData.licenseNumber
        )

        if (existsCheck.emailExists) {
            return errorResponse('A facility with this email already exists', 409)
        }

        if (existsCheck.licenseExists) {
            return errorResponse('A facility with this license number already exists', 409)
        }

        // Create facility
        const facility = await createHealthcareFacility(validatedData)

        return successResponse(facility, 'Healthcare facility created successfully')
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

        console.error('Create facility error:', error)
        return errorResponse('Failed to create healthcare facility', 500)
    }
}