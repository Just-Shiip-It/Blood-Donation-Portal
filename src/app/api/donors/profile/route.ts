import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { donorProfileSchema, userSchema } from '@/lib/db/schema'
import { updateDonorProfileSchema } from '@/lib/validations/donor'
import { eq } from 'drizzle-orm'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized' } },
                { status: 401 }
            )
        }

        // Get user data
        const userData = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (userData.length === 0) {
            return NextResponse.json(
                { success: false, error: { message: 'User not found' } },
                { status: 404 }
            )
        }

        const userRecord = userData[0]

        // Get donor profile if user is a donor
        let profileData = null
        if (userRecord.role === 'donor') {
            const donorData = await db
                .select()
                .from(donorProfileSchema)
                .where(eq(donorProfileSchema.userId, user.id))
                .limit(1)

            if (donorData.length > 0) {
                profileData = donorData[0]
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: userRecord.id,
                    email: userRecord.email,
                    role: userRecord.role,
                    emailVerified: userRecord.emailVerified,
                    isActive: userRecord.isActive
                },
                profile: profileData
            }
        })

    } catch (error) {
        console.error('Get donor profile error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Internal server error' } },
            { status: 500 }
        )
    }
}

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
        const validationResult = updateDonorProfileSchema.safeParse(body)

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

        const updateData = validationResult.data

        // Check if donor profile exists
        const existingProfile = await db
            .select()
            .from(donorProfileSchema)
            .where(eq(donorProfileSchema.userId, user.id))
            .limit(1)

        let updatedProfile

        if (existingProfile.length === 0) {
            // Create new profile if it doesn't exist
            if (!updateData.firstName || !updateData.lastName || !updateData.dateOfBirth ||
                !updateData.bloodType || !updateData.phone || !updateData.address ||
                !updateData.emergencyContact) {
                return NextResponse.json(
                    { success: false, error: { message: 'Complete profile data required for new profile' } },
                    { status: 400 }
                )
            }

            const newProfileData = {
                userId: user.id,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                dateOfBirth: updateData.dateOfBirth,
                bloodType: updateData.bloodType,
                phone: updateData.phone,
                address: updateData.address,
                medicalHistory: updateData.medicalHistory || null,
                emergencyContact: updateData.emergencyContact,
                preferences: updateData.preferences || null,
                updatedAt: new Date()
            }

            updatedProfile = await db
                .insert(donorProfileSchema)
                .values(newProfileData)
                .returning()

        } else {
            // Update existing profile
            const updateFields: Record<string, unknown> = {
                updatedAt: new Date()
            }

            // Only update provided fields
            if (updateData.firstName !== undefined) updateFields.firstName = updateData.firstName
            if (updateData.lastName !== undefined) updateFields.lastName = updateData.lastName
            if (updateData.phone !== undefined) updateFields.phone = updateData.phone
            if (updateData.address !== undefined) updateFields.address = updateData.address
            if (updateData.emergencyContact !== undefined) updateFields.emergencyContact = updateData.emergencyContact
            if (updateData.preferences !== undefined) updateFields.preferences = updateData.preferences

            updatedProfile = await db
                .update(donorProfileSchema)
                .set(updateFields)
                .where(eq(donorProfileSchema.userId, user.id))
                .returning()
        }

        return NextResponse.json({
            success: true,
            data: updatedProfile[0]
        })

    } catch (error) {
        console.error('Update donor profile error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Internal server error' } },
            { status: 500 }
        )
    }
}