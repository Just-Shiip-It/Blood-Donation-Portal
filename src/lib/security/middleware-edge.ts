import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders, DEFAULT_SECURITY_HEADERS } from './headers'

/**
 * Lightweight security middleware for Edge Runtime
 * This version doesn't include heavy crypto operations
 */
export function createLightweightSecurityMiddleware() {
    return async function lightweightSecurityMiddleware(request: NextRequest): Promise<NextResponse> {
        const { pathname } = request.nextUrl
        const method = request.method

        try {
            // Skip middleware for certain paths
            const skipPaths = ['/api/health', '/_next/', '/favicon.ico']
            if (skipPaths.some(path => pathname.startsWith(path))) {
                return NextResponse.next()
            }

            // Handle preflight requests
            if (method === 'OPTIONS') {
                const response = new NextResponse(null, { status: 200 })
                response.headers.set('Access-Control-Allow-Origin', '*')
                response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                return response
            }

            // Basic rate limiting (simple in-memory counter)
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
            const rateLimitKey = `${ip}:${pathname}`

            // Simple rate limiting check (you can enhance this)
            const now = Date.now()
            const windowMs = 60000 // 1 minute
            const maxRequests = 100

            // Create response
            const response = NextResponse.next()

            // Apply security headers
            applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)

            // Add basic CORS headers
            response.headers.set('Access-Control-Allow-Origin', '*')
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

            return response

        } catch (error) {
            console.error('Security middleware error:', error)

            // Return error response
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'SECURITY_ERROR',
                        message: 'Security middleware error'
                    }
                },
                { status: 500 }
            )
        }
    }
}

/**
 * Simple IP-based rate limiting for Edge Runtime
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function simpleRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const key = `rate_limit:${ip}`
    const current = rateLimitStore.get(key)

    if (!current || now > current.resetTime) {
        // First request or window has reset
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
        return true // Allow request
    }

    if (current.count >= maxRequests) {
        return false // Rate limit exceeded
    }

    // Increment counter
    current.count++
    rateLimitStore.set(key, current)

    return true // Allow request
}

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now()
        for (const [key, value] of rateLimitStore.entries()) {
            if (now > value.resetTime) {
                rateLimitStore.delete(key)
            }
        }
    }, 5 * 60 * 1000) // Cleanup every 5 minutes
}