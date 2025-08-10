import { NextRequest } from 'next/server'
import { AppointmentService } from '@/lib/services/appointment'
import { appointmentAvailabilitySchema } from '@/lib/validations/appointment'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        const query = appointmentAvailabilitySchema.parse({
            bloodBankId: searchParams.get('bloodBankId') || undefined,
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate'),
            location: searchParams.get('latitude') && searchParams.get('longitude') ? {
                latitude: parseFloat(searchParams.get('latitude')!),
                longitude: parseFloat(searchParams.get('longitude')!),
                radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 50,
            } : undefined,
        })

        const availableSlots = await AppointmentService.getAvailableSlots(query)

        return successResponse(availableSlots)
    } catch (error) {
        console.error('Error fetching availability:', error)
        if (error instanceof Error) {
            return errorResponse(error.message)
        }
        return serverErrorResponse('Failed to fetch availability')
    }
}