import { NextRequest, NextResponse } from 'next/server'

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitOptions {
    windowMs: number // Time window in milliseconds
    maxRequests: number // Maximum requests per window
    message?: string
    skipSuccessfulRequests?: boolean
    skipFailedRequests?: boolean
    keyGenerator?: (request: NextRequest) => string
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS = {
    // Authentication endpoints - stricter limits
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 attempts per 15 minutes
        message: 'Too many authentication attempts. Please try again later.'
    },

    // API endpoints - moderate limits
    api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // 100 requests per 15 minutes
        message: 'Too many API requests. Please try again later.'
    },

    // Search endpoints - higher limits but still controlled
    search: {
        windowMs: 1 * 60 * 1000, // 1 minute
        maxRequests: 30, // 30 searches per minute
        message: 'Too many search requests. Please slow down.'
    },

    // File upload endpoints - very strict
    upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10, // 10 uploads per hour
        message: 'Too many file uploads. Please try again later.'
    },

    // Password reset - strict limits
    passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3, // 3 attempts per hour
        message: 'Too many password reset attempts. Please try again later.'
    },

    // Email verification - moderate limits
    emailVerification: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 attempts per 15 minutes
        message: 'Too many email verification attempts. Please try again later.'
    }
} as const

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    return `rate_limit:${ip}`
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
            rateLimitStore.delete(key)
        }
    }
}

/**
 * Rate limiting middleware
 */
export function createRateLimit(options: RateLimitOptions) {
    const {
        windowMs,
        maxRequests,
        message = 'Too many requests',
        keyGenerator = defaultKeyGenerator
    } = options

    return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
        // Clean up expired entries periodically
        if (Math.random() < 0.01) { // 1% chance to cleanup
            cleanupExpiredEntries()
        }

        const key = keyGenerator(request)
        const now = Date.now()
        const resetTime = now + windowMs

        const current = rateLimitStore.get(key)

        if (!current || now > current.resetTime) {
            // First request or window has reset
            rateLimitStore.set(key, { count: 1, resetTime })
            return null // Allow request
        }

        if (current.count >= maxRequests) {
            // Rate limit exceeded
            const timeUntilReset = Math.ceil((current.resetTime - now) / 1000)

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message,
                        retryAfter: timeUntilReset
                    }
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
                        'Retry-After': timeUntilReset.toString()
                    }
                }
            )
        }

        // Increment counter
        current.count++
        rateLimitStore.set(key, current)

        return null // Allow request
    }
}

/**
 * Rate limit by user ID (for authenticated requests)
 */
export function createUserRateLimit(options: RateLimitOptions) {
    return createRateLimit({
        ...options,
        keyGenerator: (request: NextRequest) => {
            // Try to get user ID from headers or token
            const userId = request.headers.get('x-user-id') || 'anonymous'
            return `user_rate_limit:${userId}`
        }
    })
}

/**
 * Rate limit by endpoint
 */
export function createEndpointRateLimit(endpoint: string, options: RateLimitOptions) {
    return createRateLimit({
        ...options,
        keyGenerator: (request: NextRequest) => {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
            return `endpoint_rate_limit:${endpoint}:${ip}`
        }
    })
}

/**
 * Adaptive rate limiting based on user behavior
 */
export class AdaptiveRateLimit {
    private suspiciousIPs = new Set<string>()
    private failedAttempts = new Map<string, number>()

    /**
     * Mark an IP as suspicious
     */
    markSuspicious(ip: string): void {
        this.suspiciousIPs.add(ip)
        setTimeout(() => {
            this.suspiciousIPs.delete(ip)
        }, 60 * 60 * 1000) // Remove after 1 hour
    }

    /**
     * Record a failed attempt
     */
    recordFailedAttempt(ip: string): void {
        const current = this.failedAttempts.get(ip) || 0
        this.failedAttempts.set(ip, current + 1)

        // Mark as suspicious after 3 failed attempts
        if (current + 1 >= 3) {
            this.markSuspicious(ip)
        }

        // Clean up after 15 minutes
        setTimeout(() => {
            this.failedAttempts.delete(ip)
        }, 15 * 60 * 1000)
    }

    /**
     * Get rate limit for IP based on behavior
     */
    getRateLimit(ip: string): RateLimitOptions {
        if (this.suspiciousIPs.has(ip)) {
            // Stricter limits for suspicious IPs
            return {
                windowMs: 15 * 60 * 1000,
                maxRequests: 10,
                message: 'Your IP has been flagged for suspicious activity. Reduced rate limits apply.'
            }
        }

        const failedCount = this.failedAttempts.get(ip) || 0
        if (failedCount >= 2) {
            // Moderate limits for IPs with failed attempts
            return {
                windowMs: 15 * 60 * 1000,
                maxRequests: 25,
                message: 'Reduced rate limits due to recent failed attempts.'
            }
        }

        // Normal limits
        return RATE_LIMIT_CONFIGS.api
    }

    /**
     * Create adaptive rate limit middleware
     */
    createMiddleware() {
        return async (request: NextRequest): Promise<NextResponse | null> => {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
            const rateLimit = this.getRateLimit(ip)

            const rateLimitMiddleware = createRateLimit(rateLimit)
            return await rateLimitMiddleware(request)
        }
    }
}

// Global adaptive rate limiter instance
export const adaptiveRateLimit = new AdaptiveRateLimit()

/**
 * DDoS protection middleware
 */
export function createDDoSProtection() {
    const requestCounts = new Map<string, { count: number; firstRequest: number }>()
    const DDOS_THRESHOLD = 100 // requests per minute
    const DDOS_WINDOW = 60 * 1000 // 1 minute

    return async function ddosProtection(request: NextRequest): Promise<NextResponse | null> {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        const now = Date.now()

        const current = requestCounts.get(ip)

        if (!current || now - current.firstRequest > DDOS_WINDOW) {
            // Reset counter
            requestCounts.set(ip, { count: 1, firstRequest: now })
            return null
        }

        current.count++

        if (current.count > DDOS_THRESHOLD) {
            // Potential DDoS attack
            console.warn(`Potential DDoS attack from IP: ${ip}`)

            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'DDOS_PROTECTION',
                        message: 'Request blocked due to suspicious activity'
                    }
                },
                { status: 429 }
            )
        }

        return null
    }
}