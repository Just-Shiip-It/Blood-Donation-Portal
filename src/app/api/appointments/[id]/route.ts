import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentService } from '@/lib/services/appointment'
import { updateAppointmentSchema } from '@/lib/validations/appointment'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const resolvedParams = await params
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const body = await request.json()
        const validatedData = updateAppointmentSchema.parse(body)

        // Get donor profile ID from user
        const { data: profile } = await supabase
            .from('donor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) {
            return errorResponse('Donor profile not found')
        }

        const appointment = await AppointmentService.updateAppointment(
            resolvedParams.id,
            profile.id,
            validatedData
        )

        return successResponse(appointment, 'Appointment updated successfully')
    } catch (error) {
        console.error('Error updating appointment:', error)
        if (error instanceof Error) {
            return errorResponse(error.message)
        }
        return serverErrorResponse('Failed to update appointment')
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const resolvedParams = await params
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        // Get donor profile ID from user
        const { data: profile } = await supabase
            .from('donor_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!profile) {
            return errorResponse('Donor profile not found')
        }

        const appointment = await AppointmentService.cancelAppointment(resolvedParams.id, profile.id)

        return successResponse(appointment, 'Appointment cancelled successfully')
    } catch (error) {
        console.error('Error cancelling appointment:', error)
        if (error instanceof Error) {
            return errorResponse(error.message)
        }
        return serverErrorResponse('Failed to cancel appointment')
    }
}