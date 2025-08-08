import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const resendSchema = z.object({
    email: z.string().email('Invalid email address')
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = resendSchema.parse(body)
        const { email } = validatedData

        const supabase = await createClient()

        // Resend confirmation email
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email
        })

        if (error) {
            console.error('Resend confirmation error:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'RESEND_ERROR',
                        message: error.message
                    }
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Confirmation email sent successfully. Please check your inbox.'
        })

    } catch (error) {
        console.error('Resend confirmation error:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid email address'
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