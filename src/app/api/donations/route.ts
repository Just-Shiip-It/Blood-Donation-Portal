import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DonationHistoryService } from '@/lib/services/donation-history'
import {
    createDonationRecordSchema,
    donationHistoryQuerySchema
} from '@/lib/validations/donation-history'
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

        const validationResult = donationHistoryQuerySchema.safeParse(queryParams)
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
            // Donors can only see their own donation history
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
            // Blood bank admins can see donations for their blood bank
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

        const result = await DonationHistoryService.getDonationHistory(query)

        return successResponse({
            donations: result.donations,
            pagination: result.pagination
        })

    } catch (error) {
        console.error('Get donation history error:', error)
        return serverErrorResponse()
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const body = await request.json()
        const validationResult = createDonationRecordSchema.safeParse(body)

        if (!validationResult.success) {
            return validationErrorResponse(validationResult.error.flatten().fieldErrors)
        }

        const donationData = validationResult.data

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        // Only blood bank admins and system admins can create donation records
        if (userData.role !== 'admin' && userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        // If user is a blood bank admin, ensure they can only create records for their blood bank
        if (userData.role === 'admin') {
            const { data: bloodBankProfile } = await supabase
                .from('blood_bank_profiles')
                .select('blood_bank_id')
                .eq('user_id', user.id)
                .single()

            if (!bloodBankProfile || bloodBankProfile.blood_bank_id !== donationData.bloodBankId) {
                return errorResponse('Can only create donation records for your blood bank', 403)
            }
        }

        // Verify donor exists and is active
        const { data: donorProfile } = await supabase
            .from('donor_profiles')
            .select('id, user_id, last_donation_date')
            .eq('id', donationData.donorId)
            .single()

        if (!donorProfile) {
            return errorResponse('Donor not found', 404)
        }

        // Check if donor is eligible (56 days since last donation)
        if (donorProfile.last_donation_date) {
            const lastDonationDate = new Date(donorProfile.last_donation_date)
            const donationDate = new Date(donationData.donationDate)
            const daysSinceLastDonation = Math.floor((donationDate.getTime() - lastDonationDate.getTime()) / (1000 * 60 * 60 * 24))

            if (daysSinceLastDonation < 56) {
                return errorResponse(`Donor must wait ${56 - daysSinceLastDonation} more days before next donation`, 400)
            }
        }

        // Verify blood bank exists
        const { data: bloodBank } = await supabase
            .from('blood_banks')
            .select('id')
            .eq('id', donationData.bloodBankId)
            .single()

        if (!bloodBank) {
            return errorResponse('Blood bank not found', 404)
        }

        // Verify appointment if provided
        if (donationData.appointmentId) {
            const { data: appointment } = await supabase
                .from('appointments')
                .select('id, donor_id, blood_bank_id, status')
                .eq('id', donationData.appointmentId)
                .single()

            if (!appointment) {
                return errorResponse('Appointment not found', 404)
            }

            if (appointment.donor_id !== donationData.donorId) {
                return errorResponse('Appointment does not belong to this donor', 400)
            }

            if (appointment.blood_bank_id !== donationData.bloodBankId) {
                return errorResponse('Appointment is not for this blood bank', 400)
            }

            if (appointment.status !== 'scheduled') {
                return errorResponse('Appointment is not in scheduled status', 400)
            }
        }

        const newDonation = await DonationHistoryService.createDonationRecord(donationData)

        return successResponse(newDonation, 'Donation record created successfully')

    } catch (error) {
        console.error('Create donation record error:', error)
        return serverErrorResponse()
    }
}