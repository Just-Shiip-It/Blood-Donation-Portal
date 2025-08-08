import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()

        // Sign out from Supabase
        const { error } = await supabase.auth.signOut()

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'LOGOUT_ERROR',
                        message: error.message
                    }
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        })

    } catch (error) {
        console.error('Logout error:', error)

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