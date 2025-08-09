import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { donorProfileSchema, userSchema } from '@/lib/db/schema'
import { updateMedicalHistorySchema } from '@/lib/validations/donor'
import { eq } from 'drizzle-orm'

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized' } },
                { status: 401 }
            )
        }

        // Verify user is a donor
        const userData = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (userData.length === 0 || userData[0].role !== 'donor') {
            return NextResponse.json(
                { success: false, error: { message: 'Access denied' } },
                { status: 403 }
            )
        }

        const body = await request.json()
        const validationResult = updateMedicalHistorySchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Validation failed',
                        details: validationResult.error.flatten().fieldErrors
                    }
                },
                { status: 400 }
            )
        }

        const medicalHistoryData = validationResult.data

        // Check if donor profile exists
        const existingProfile = await db
            .select()
            .from(donorProfileSchema)
            .where(eq(donorProfileSchema.userId, user.id))
            .limit(1)

        if (existingProfile.length === 0) {
            return NextResponse.json(
                { success: false, error: { message: 'Donor profile not found' } },
                { status: 404 }
            )
        }

        // Merge with existing medical history
        const currentMedicalHistory = existingProfile[0].medicalHistory || {}
        const updatedMedicalHistory = {
            ...currentMedicalHistory,
            ...medicalHistoryData
        }

        // Update the medical history
        const updatedProfile = await db
            .update(donorProfileSchema)
            .set({
                medicalHistory: updatedMedicalHistory,
                updatedAt: new Date()
            })
            .where(eq(donorProfileSchema.userId, user.id))
            .returning()

        return NextResponse.json({
            success: true,
            data: {
                medicalHistory: updatedProfile[0].medicalHistory
            }
        })

    } catch (error) {
        console.error('Update medical history error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Internal server error' } },
            { status: 500 }
        )
    }
}