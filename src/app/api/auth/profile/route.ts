import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema, donorProfileSchema } from '@/lib/db/schema'
import { updateProfileSchema } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'

// Get user profile
export async function GET() {
    try {
        const supabase = await createClient()

        // Get current user from Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                },
                { status: 401 }
            )
        }

        // Get user data from our database
        const [userData] = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (!userData) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    }
                },
                { status: 404 }
            )
        }

        let profile = null

        // If user is a donor, get their profile
        if (userData.role === 'donor') {
            const [donorProfile] = await db
                .select()
                .from(donorProfileSchema)
                .where(eq(donorProfileSchema.userId, user.id))
                .limit(1)

            profile = donorProfile || null
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    emailVerified: userData.emailVerified,
                    isActive: userData.isActive,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt
                },
                profile
            }
        })

    } catch (error) {
        console.error('Get profile error:', error)

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

// Update user profile
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = updateProfileSchema.parse(body)

        const supabase = await createClient()

        // Get current user from Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                },
                { status: 401 }
            )
        }

        // Get user data from our database
        const [userData] = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (!userData) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'USER_NOT_FOUND',
                        message: 'User not found'
                    }
                },
                { status: 404 }
            )
        }

        // Only donors can update their profile
        if (userData.role !== 'donor') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Only donors can update their profile'
                    }
                },
                { status: 403 }
            )
        }

        // Update donor profile
        const updateData: Record<string, unknown> = {
            updatedAt: new Date()
        }

        if (validatedData.firstName) updateData.firstName = validatedData.firstName
        if (validatedData.lastName) updateData.lastName = validatedData.lastName
        if (validatedData.phone) updateData.phone = validatedData.phone
        if (validatedData.address) updateData.address = validatedData.address
        if (validatedData.emergencyContact) updateData.emergencyContact = validatedData.emergencyContact
        if (validatedData.preferences) updateData.preferences = validatedData.preferences

        const [updatedProfile] = await db
            .update(donorProfileSchema)
            .set(updateData)
            .where(eq(donorProfileSchema.userId, user.id))
            .returning()

        if (!updatedProfile) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'PROFILE_NOT_FOUND',
                        message: 'Donor profile not found'
                    }
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                profile: updatedProfile,
                message: 'Profile updated successfully'
            }
        })

    } catch (error) {
        console.error('Update profile error:', error)

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