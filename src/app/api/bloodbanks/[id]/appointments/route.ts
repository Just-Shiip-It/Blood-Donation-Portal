import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentService } from '@/lib/services/appointment'
import { appointmentFilterSchema } from '@/lib/validations/appointment'
import { successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse } from '@/lib/api/response'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const resolvedParams = await params
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        // Verify user has access to this blood bank
        const { data: bloodBank } = await supabase
            .from('blood_banks')
            .select('id')
            .eq('id', resolvedParams.id)
            .single()

        if (!bloodBank) {
            return notFoundResponse('Blood bank not found')
        }

        // TODO: Add proper authorization check for blood bank staff

        const { searchParams } = new URL(request.url)
        const filters = appointmentFilterSchema.parse({
            status: searchParams.get('status') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        })

        const appointments = await AppointmentService.getBloodBankAppointments(resolvedParams.id, filters)

        return successResponse(appointments)
    } catch (error) {
        console.error('Error fetching blood bank appointments:', error)
        return serverErrorResponse('Failed to fetch appointments')
    }
}