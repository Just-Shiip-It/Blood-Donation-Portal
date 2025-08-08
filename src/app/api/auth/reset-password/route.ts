import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resetPasswordSchema } from '@/lib/validations/auth'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = resetPasswordSchema.parse(body)
        const { password } = validatedData

        const supabase = await createClient()

        // Verify the reset token and update password
        const { error } = await supabase.auth.updateUser({
            password: password
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
            message: 'Password updated successfully. You can now log in with your new password.'
        })

    } catch (error) {
        console.error('Reset password error:', error)

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