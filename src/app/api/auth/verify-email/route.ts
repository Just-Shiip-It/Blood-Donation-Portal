import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema } from '@/lib/db/schema'
import { verifyEmailSchema } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = verifyEmailSchema.parse(body)
        const { token } = validatedData

        const supabase = await createClient()

        // Verify the email token
        const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email'
        })

        if (error || !data.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VERIFICATION_ERROR',
                        message: error?.message || 'Invalid verification token'
                    }
                },
                { status: 400 }
            )
        }

        // Update user's email verification status in our database
        await db
            .update(userSchema)
            .set({
                emailVerified: true,
                updatedAt: new Date()
            })
            .where(eq(userSchema.id, data.user.id))

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully. You can now log in.'
        })

    } catch (error) {
        console.error('Verify email error:', error)

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