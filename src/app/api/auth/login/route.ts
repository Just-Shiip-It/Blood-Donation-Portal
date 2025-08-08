import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema } from '@/lib/db/schema'
import { loginSchema } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = loginSchema.parse(body)
        const { email, password } = validatedData

        const supabase = await createClient()

        // Authenticate with Supabase
        console.log('Attempting login for email:', email)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (authError) {
            console.error('Supabase auth error:', authError)

            // Handle email not confirmed error specifically
            if (authError.message === 'Email not confirmed') {
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'EMAIL_NOT_CONFIRMED',
                            message: 'Please check your email and click the confirmation link before logging in. If you didn\'t receive the email, you can request a new one.'
                        }
                    },
                    { status: 401 }
                )
            }

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'AUTH_ERROR',
                        message: authError.message
                    }
                },
                { status: 401 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'LOGIN_FAILED',
                        message: 'Login failed'
                    }
                },
                { status: 401 }
            )
        }

        // Get user data from our database
        const [user] = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, authData.user.id))
            .limit(1)

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found in database'
                    }
                },
                { status: 404 }
            )
        }

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'ACCOUNT_DISABLED',
                        message: 'Your account has been disabled. Please contact support.'
                    }
                },
                { status: 403 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    emailVerified: user.emailVerified,
                    isActive: user.isActive
                },
                session: {
                    accessToken: authData.session?.access_token,
                    refreshToken: authData.session?.refresh_token,
                    expiresAt: authData.session?.expires_at
                }
            }
        })

    } catch (error) {
        console.error('Login error:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: error.message
                    }
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Internal server error'
                }
            },
            { status: 500 }
        )
    }
}