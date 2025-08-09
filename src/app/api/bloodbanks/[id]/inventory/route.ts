import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BloodBankService } from '@/lib/services/blood-bank'
import { bulkInventoryUpdateSchema } from '@/lib/validations/blood-bank'
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

        return successResponse({
            inventory: bloodBank.inventory,
            summary: await BloodBankService.getInventorySummary(resolvedParams.id)
        })
    } catch (error) {
        console.error('Error fetching inventory:', error)
        return serverErrorResponse('Failed to fetch inventory')
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
        const validatedData = bulkInventoryUpdateSchema.parse(body)

        const resolvedParams = await params
        await BloodBankService.bulkUpdateInventory(resolvedParams.id, validatedData.updates)

        return successResponse({ message: 'Inventory updated successfully' })
    } catch (error) {
        console.error('Error updating inventory:', error)
        if (error instanceof Error && error.message.includes('validation')) {
            return errorResponse('Invalid data provided', 400)
        }
        return serverErrorResponse('Failed to update inventory')
    }
}