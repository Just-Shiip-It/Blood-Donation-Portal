import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema, donorProfileSchema } from '@/lib/db/schema'
import { registerSchema } from '@/lib/validations/auth'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate request body
        const validatedData = registerSchema.parse(body)
        const { email, password, role, profile } = validatedData

        const supabase = await createClient()

        // Check if user already exists in our database
        const existingUser = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.email, email))
            .limit(1)

        if (existingUser.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'USER_EXISTS',
                        message: 'User with this email already exists'
                    }
                },
                { status: 400 }
            )
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    email_verified: false
                }
            }
        })

        if (authError) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'AUTH_ERROR',
                        message: authError.message
                    }
                },
                { status: 400 }
            )
        }

        if (!authData.user) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'USER_CREATION_FAILED',
                        message: 'Failed to create user account'
                    }
                },
                { status: 500 }
            )
        }

        // Create user record in our database
        let newUser
        try {
            [newUser] = await db
                .insert(userSchema)
                .values({
                    id: authData.user.id,
                    email,
                    role,
                    emailVerified: false,
                    isActive: true
                })
                .returning()
        } catch (dbError) {
            console.error('Database error creating user:', dbError)
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Failed to create user record. Please check your database connection and try again.'
                    }
                },
                { status: 500 }
            )
        }

        // If role is donor, create donor profile
        if (role === 'donor' && profile) {
            try {
                await db
                    .insert(donorProfileSchema)
                    .values({
                        userId: newUser.id,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        dateOfBirth: profile.dateOfBirth,
                        bloodType: profile.bloodType,
                        phone: profile.phone,
                        address: profile.address,
                        emergencyContact: profile.emergencyContact,
                        preferences: profile.preferences || {}
                        // Note: createdAt and updatedAt are handled by database defaults
                    })
            } catch (dbError) {
                console.error('Database error creating donor profile:', dbError)
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'DATABASE_ERROR',
                            message: 'Failed to create donor profile. Please check your database setup and try again.'
                        }
                    },
                    { status: 500 }
                )
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    emailVerified: newUser.emailVerified
                },
                message: 'Registration successful. Please check your email to verify your account.'
            }
        })

    } catch (error) {
        console.error('Registration error:', error)

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