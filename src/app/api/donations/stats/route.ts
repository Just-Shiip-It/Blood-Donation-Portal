import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DonationHistoryService } from '@/lib/services/donation-history'
import { donationStatsQuerySchema } from '@/lib/validations/donation-history'
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

        const validationResult = donationStatsQuerySchema.safeParse(queryParams)
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

        // Role-based access control
        if (userData.role === 'donor') {
            // Donors can only see their own donation statistics
            const { data: donorProfile } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!donorProfile) {
                return errorResponse('Donor profile not found', 404)
            }

            query.donorId = donorProfile.id
        } else if (userData.role === 'admin') {
            // Blood bank admins can see statistics for their blood bank
            const { data: bloodBankProfile } = await supabase
                .from('blood_bank_profiles')
                .select('blood_bank_id')
                .eq('user_id', user.id)
                .single()

            if (bloodBankProfile) {
                query.bloodBankId = bloodBankProfile.blood_bank_id
            }
        } else if (userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        const stats = await DonationHistoryService.getDonationStats(query)

        return successResponse(stats)

    } catch (error) {
        console.error('Get donation statistics error:', error)
        return serverErrorResponse()
    }
}