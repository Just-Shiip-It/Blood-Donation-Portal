import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BloodBankService } from '@/lib/services/blood-bank'
import { bloodBankProfileSchema } from '@/lib/validations/blood-bank'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/api/response'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const resolvedParams = await params
        const bloodBank = await BloodBankService.getBloodBankById(resolvedParams.id)

        if (!bloodBank) {
            return notFoundResponse('Blood bank not found')
        }

        return successResponse(bloodBank)
    } catch (error) {
        console.error('Error fetching blood bank:', error)
        return serverErrorResponse('Failed to fetch blood bank')
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const body = await request.json()
        const validatedData = bloodBankProfileSchema.partial().parse(body)

        const resolvedParams = await params
        await BloodBankService.updateBloodBank(resolvedParams.id, validatedData)

        return successResponse({ message: 'Blood bank updated successfully' })
    } catch (error) {
        console.error('Error updating blood bank:', error)
        if (error instanceof Error && error.message.includes('validation')) {
            return errorResponse('Invalid data provided', 400)
        }
        return serverErrorResponse('Failed to update blood bank')
    }
}