import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NotificationService } from '@/lib/services/notification'
import { z } from 'zod'

const notificationPreferencesSchema = z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    reminderHours: z.number().min(1).max(168) // 1 hour to 1 week
})

const updatePreferencesSchema = z.object({
    userId: z.string().uuid(),
    preferences: notificationPreferencesSchema
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            )
        }

        // Verify user authentication
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

        // Verify user can access these preferences (either their own or admin)
        if (user.id !== userId) {
            // TODO: Add admin role check
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        const preferences = await NotificationService.getNotificationPreferences(userId)

        if (!preferences) {
            return NextResponse.json(
                { error: 'Preferences not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            preferences
        })
    } catch (error) {
        console.error('Error fetching notification preferences:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = updatePreferencesSchema.parse(body)

        // Verify user authentication
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

        // Verify user can update these preferences (either their own or admin)
        if (user.id !== validatedData.userId) {
            // TODO: Add admin role check
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        const success = await NotificationService.updateNotificationPreferences(
            validatedData.userId,
            validatedData.preferences
        )

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to update preferences' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Notification preferences updated successfully'
        })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.issues },
                { status: 400 }
            )
        }

        console.error('Error updating notification preferences:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}