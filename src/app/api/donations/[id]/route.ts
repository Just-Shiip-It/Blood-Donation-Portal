import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DonationHistoryService } from '@/lib/services/donation-history'
import { updateDonationRecordSchema } from '@/lib/validations/donation-history'
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/api/response'

interface RouteParams {
    params: Promise<{
        id: string
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const { id: donationId } = await params

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        const donation = await DonationHistoryService.getDonationById(donationId)

        if (!donation) {
            return notFoundResponse('Donation record not found')
        }

        // Role-based access control
        if (userData.role === 'donor') {
            // Donors can only see their own donation records
            const { data: donorProfile } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!donorProfile || donorProfile.id !== donation.donorId) {
                return errorResponse('Access denied', 403)
            }
        } else if (userData.role === 'admin') {
            // Blood bank admins can see donations for their blood bank
            const { data: bloodBankProfile } = await supabase
                .from('blood_bank_profiles')
                .select('blood_bank_id')
                .eq('user_id', user.id)
                .single()

            if (!bloodBankProfile || bloodBankProfile.blood_bank_id !== donation.bloodBankId) {
                return errorResponse('Access denied', 403)
            }
        } else if (userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        return successResponse(donation)

    } catch (error) {
        console.error('Get donation record error:', error)
        return serverErrorResponse()
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const { id: donationId } = await params
        const body = await request.json()

        const validationResult = updateDonationRecordSchema.safeParse(body)
        if (!validationResult.success) {
            return validationErrorResponse(validationResult.error.flatten().fieldErrors)
        }

        const updateData = validationResult.data

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        // Only blood bank admins and system admins can update donation records
        if (userData.role !== 'admin' && userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        // Get existing donation record
        const existingDonation = await DonationHistoryService.getDonationById(donationId)
        if (!existingDonation) {
            return notFoundResponse('Donation record not found')
        }

        // If user is a blood bank admin, ensure they can only update records for their blood bank
        if (userData.role === 'admin') {
            const { data: bloodBankProfile } = await supabase
                .from('blood_bank_profiles')
                .select('blood_bank_id')
                .eq('user_id', user.id)
                .single()

            if (!bloodBankProfile || bloodBankProfile.blood_bank_id !== existingDonation.bloodBankId) {
                return errorResponse('Can only update donation records for your blood bank', 403)
            }

            // Blood bank admins cannot change the blood bank ID
            if (updateData.bloodBankId && updateData.bloodBankId !== existingDonation.bloodBankId) {
                return errorResponse('Cannot change blood bank for donation record', 403)
            }
        }

        // Verify blood bank exists if being updated
        if (updateData.bloodBankId) {
            const { data: bloodBank } = await supabase
                .from('blood_banks')
                .select('id')
                .eq('id', updateData.bloodBankId)
                .single()

            if (!bloodBank) {
                return errorResponse('Blood bank not found', 404)
            }
        }

        const updatedDonation = await DonationHistoryService.updateDonationRecord(donationId, updateData)

        if (!updatedDonation) {
            return notFoundResponse('Donation record not found')
        }

        return successResponse(updatedDonation, 'Donation record updated successfully')

    } catch (error) {
        console.error('Update donation record error:', error)
        return serverErrorResponse()
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const { id: donationId } = await params

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        // Only system admins can delete donation records
        if (userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        // Get existing donation record to verify it exists
        const existingDonation = await DonationHistoryService.getDonationById(donationId)
        if (!existingDonation) {
            return notFoundResponse('Donation record not found')
        }

        const deleted = await DonationHistoryService.deleteDonationRecord(donationId)

        if (!deleted) {
            return notFoundResponse('Donation record not found')
        }

        return successResponse(null, 'Donation record deleted successfully')

    } catch (error) {
        console.error('Delete donation record error:', error)
        return serverErrorResponse()
    }
}