import { NextRequest } from 'next/server'
import { NotificationService } from '@/lib/services/notification'
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
    try {
        // Verify this is a legitimate cron request
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return unauthorizedResponse('Invalid cron authorization')
        }

        await NotificationService.processAppointmentReminders()

        return successResponse({ processed: true }, 'Appointment reminders processed successfully')
    } catch (error) {
        console.error('Error processing appointment reminders:', error)
        return serverErrorResponse('Failed to process appointment reminders')
    }
}

// Allow GET for testing purposes (remove in production)
export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return notFoundResponse('Not found')
    }

    try {
        await NotificationService.processAppointmentReminders()
        return successResponse({ processed: true }, 'Appointment reminders processed successfully (test)')
    } catch (error) {
        console.error('Error processing appointment reminders:', error)
        return serverErrorResponse('Failed to process appointment reminders')
    }
}