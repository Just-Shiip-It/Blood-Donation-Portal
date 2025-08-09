import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BloodBankService } from '@/lib/services/blood-bank'
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

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
        const alerts = await BloodBankService.getInventoryAlerts(resolvedParams.id)

        return successResponse(alerts)
    } catch (error) {
        console.error('Error fetching inventory alerts:', error)
        return serverErrorResponse('Failed to fetch inventory alerts')
    }
}