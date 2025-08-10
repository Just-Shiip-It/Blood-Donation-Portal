import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DonationHistoryService } from '@/lib/services/donation-history'
import { healthInsightsSchema } from '@/lib/validations/donation-history'
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const { searchParams } = new URL(request.url)
        const queryParams = Object.fromEntries(searchParams.entries())

        const validationResult = healthInsightsSchema.safeParse(queryParams)
        if (!validationResult.success) {
            return validationErrorResponse(validationResult.error.flatten().fieldErrors)
        }

        const query = validationResult.data

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        // Role-based access control - only donors and system admins can access health insights
        if (userData.role === 'donor') {
            // Donors can only see their own health insights
            const { data: donorProfile } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!donorProfile) {
                return errorResponse('Donor profile not found', 404)
            }

            // Ensure donor can only access their own insights
            if (query.donorId !== donorProfile.id) {
                return errorResponse('Access denied', 403)
            }
        } else if (userData.role === 'system_admin') {
            // System admins can access any donor's insights
            if (!query.donorId) {
                return errorResponse('Donor ID is required', 400)
            }
        } else {
            return errorResponse('Access denied', 403)
        }

        // Verify donor exists
        const { data: donorProfile } = await supabase
            .from('donor_profiles')
            .select('id, first_name, last_name')
            .eq('id', query.donorId)
            .single()

        if (!donorProfile) {
            return errorResponse('Donor not found', 404)
        }

        const insights = await DonationHistoryService.getHealthInsights(query)

        return successResponse({
            donor: {
                id: donorProfile.id,
                firstName: donorProfile.first_name,
                lastName: donorProfile.last_name
            },
            insights
        })

    } catch (error) {
        console.error('Get health insights error:', error)
        return serverErrorResponse()
    }
}