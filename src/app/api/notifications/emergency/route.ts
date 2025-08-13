import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NotificationService, EmergencyNotificationData } from '@/lib/services/notification'
import { z } from 'zod'

const emergencyNotificationSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    urgencyLevel: z.enum(['routine', 'urgent', 'emergency']),
    facilityName: z.string().min(1),
    requestId: z.string().uuid(),
    unitsNeeded: z.number().min(1),
    requiredBy: z.string().datetime(),
    additionalInfo: z.string().optional()
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = emergencyNotificationSchema.parse(body)

        // Verify user authentication and authorization
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // TODO: Verify user has permission to send emergency notifications
        // This should be restricted to healthcare facilities and blood bank administrators

        // Find eligible donors based on blood type and eligibility criteria
        const eligibleDonorIds = await findEligibleDonors(validatedData.bloodType)

        if (eligibleDonorIds.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'No eligible donors found for this blood type',
                    donorsNotified: 0
                }
            )
        }

        // Prepare emergency notification data
        const emergencyData: EmergencyNotificationData = {
            bloodType: validatedData.bloodType,
            urgencyLevel: validatedData.urgencyLevel,
            facilityName: validatedData.facilityName,
            requestId: validatedData.requestId,
            eligibleDonorIds
        }

        // Send emergency notifications
        const success = await NotificationService.sendEmergencyBloodRequest(emergencyData)

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to send emergency notifications' },
                { status: 500 }
            )
        }

        // Log the emergency notification for audit purposes
        await logEmergencyNotification({
            ...validatedData,
            donorsNotified: eligibleDonorIds.length,
            sentBy: user.id,
            sentAt: new Date().toISOString()
        })

        return NextResponse.json({
            success: true,
            message: 'Emergency notifications sent successfully',
            donorsNotified: eligibleDonorIds.length,
            bloodType: validatedData.bloodType,
            urgencyLevel: validatedData.urgencyLevel
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            )
        }

        console.error('Error sending emergency notifications:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to find eligible donors
async function findEligibleDonors(bloodType: string): Promise<string[]> {
    try {
        // TODO: Implement actual database query to find eligible donors
        // This should consider:
        // 1. Matching blood type (including compatible types)
        // 2. Last donation date (56+ days ago)
        // 3. Not deferred (temporary or permanent)
        // 4. Active account
        // 5. Notification preferences allow emergency notifications

        console.log(`Finding eligible donors for blood type: ${bloodType}`)

        // Placeholder - return mock donor IDs
        const mockDonorIds = [
            '123e4567-e89b-12d3-a456-426614174001',
            '123e4567-e89b-12d3-a456-426614174002',
            '123e4567-e89b-12d3-a456-426614174003'
        ]

        return mockDonorIds
    } catch (error) {
        console.error('Error finding eligible donors:', error)
        return []
    }
}

// Helper function to log emergency notifications
async function logEmergencyNotification(data: Record<string, unknown>): Promise<void> {
    try {
        // TODO: Implement logging to database for audit trail
        console.log('Emergency notification logged:', data)

        // This should store:
        // - Request details
        // - Number of donors notified
        // - Timestamp
        // - Requesting user/facility
        // - Response metrics (if available)
    } catch (error) {
        console.error('Error logging emergency notification:', error)
    }
}

// Get emergency notification history (for administrators)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Verify user authentication and authorization
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // TODO: Implement actual database query to fetch emergency notification history
        const mockHistory = [
            {
                id: '1',
                bloodType: 'O-',
                urgencyLevel: 'emergency',
                facilityName: 'City General Hospital',
                requestId: '123e4567-e89b-12d3-a456-426614174000',
                donorsNotified: 15,
                sentAt: new Date().toISOString(),
                unitsNeeded: 3
            }
        ]

        return NextResponse.json({
            success: true,
            notifications: mockHistory,
            total: mockHistory.length,
            limit,
            offset
        })
    } catch (error) {
        console.error('Error fetching emergency notification history:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}