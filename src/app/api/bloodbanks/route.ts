import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BloodBankService } from '@/lib/services/blood-bank'
import { bloodBankProfileSchema } from '@/lib/validations/blood-bank'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const bloodBanks = await BloodBankService.getAllBloodBanks()
        return successResponse(bloodBanks)
    } catch (error) {
        console.error('Error fetching blood banks:', error)
        return serverErrorResponse('Failed to fetch blood banks')
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
        const validatedData = bloodBankProfileSchema.parse(body)

        const bloodBankId = await BloodBankService.createBloodBank(validatedData)

        return NextResponse.json({ success: true, data: { id: bloodBankId } }, { status: 201 })
    } catch (error) {
        console.error('Error creating blood bank:', error)
        if (error instanceof Error && error.message.includes('validation')) {
            return errorResponse('Invalid data provided', 400)
        }
        return serverErrorResponse('Failed to create blood bank')
    }
}