import { NextRequest, NextResponse } from 'next/server'
import { SecurityMiddlewares } from '@/lib/security'
import { z } from 'zod'

// Test schema for validation
const testSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    message: z.string().min(1).max(1000)
})

export async function POST(request: NextRequest) {
    // Apply security middleware
    const securityResponse = await SecurityMiddlewares.api(request)

    // If security middleware returns a response, it means there was a security issue
    if (securityResponse.status !== 200) {
        return securityResponse
    }

    try {
        const body = await request.json()

        // Validate input with schema
        const validatedData = testSchema.parse(body)

        // Process the request (this is where your business logic would go)
        const result = {
            message: 'Security test passed',
            data: validatedData,
            timestamp: new Date().toISOString()
        }

        return NextResponse.json({
            success: true,
            data: result
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input data',
                        details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
                    }
                },
                { status: 400 }
            )
        }

        console.error('Security test error:', error)
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

export async function GET(request: NextRequest) {
    // Apply public security middleware (less restrictive)
    const securityResponse = await SecurityMiddlewares.public(request)

    if (securityResponse.status !== 200) {
        return securityResponse
    }

    return NextResponse.json({
        success: true,
        data: {
            message: 'Security middleware is working',
            timestamp: new Date().toISOString(),
            headers: {
                userAgent: request.headers.get('user-agent'),
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            }
        }
    })
}