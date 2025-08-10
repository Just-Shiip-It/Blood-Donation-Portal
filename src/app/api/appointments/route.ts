import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentService } from '@/lib/services/appointment'
import { createAppointmentSchema, appointmentFilterSchema } from '@/lib/validations/appointment'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const body = await request.json()
        const validatedData = createAppointmentSchema.parse(body)

        // Get donor profile ID from user
        const { data: profile } = await supabase
            .from('donor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) {
            return errorResponse('Donor profile not found')
        }

        const appointment = await AppointmentService.createAppointment(profile.id, validatedData)

        return successResponse(appointment, 'Appointment created successfully')
    } catch (error) {
        console.error('Error creating appointment:', error)
        if (error instanceof Error) {
            return errorResponse(error.message)
        }
        return serverErrorResponse('Failed to create appointment')
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const { searchParams } = new URL(request.url)
        const filters = appointmentFilterSchema.parse({
            status: searchParams.get('status') || undefined,
            bloodBankId: searchParams.get('bloodBankId') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            limit: parseInt(searchParams.get('limit') || '10'),
        })

        // Get donor profile ID from user
        const { data: profile } = await supabase
            .from('donor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) {
            return errorResponse('Donor profile not found')
        }

        const appointments = await AppointmentService.getDonorAppointments(profile.id, filters)

        return successResponse(appointments)
    } catch (error) {
        console.error('Error fetching appointments:', error)
        return serverErrorResponse('Failed to fetch appointments')
    }
}