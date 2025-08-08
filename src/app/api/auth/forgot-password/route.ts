import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resetPasswordRequestSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = resetPasswordRequestSchema.parse(body)
        const { email } = validatedData

        const supabase = await createClient()

        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXTAUTH_URL}/reset-password`
        })

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'RESET_ERROR',
                        message: error.message
                    }
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Password reset email sent. Please check your inbox.'
        })

    } catch (error) {
        console.error('Forgot password error:', error)

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