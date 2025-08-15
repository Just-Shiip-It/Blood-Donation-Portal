import { NextRequest, NextResponse } from 'next/server'
import { createRateLimit, RATE_LIMIT_CONFIGS, adaptiveRateLimit } from './rate-limiting'
import { applySecurityHeaders, applyCORSHeaders, DEFAULT_SECURITY_HEADERS, DEFAULT_CORS_CONFIG } from './headers'
import { createValidationMiddleware, SecurityValidationOptions } from './validation'
import { SupabaseSessionManager } from './session'
import { EnhancedAuditService } from './audit-enhanced'
import { z } from 'zod'

export interface SecurityMiddlewareConfig {
    // Rate limiting configuration
    rateLimit?: {
        enabled: boolean
        config: keyof typeof RATE_LIMIT_CONFIGS | 'custom'
        customConfig?: {
            windowMs: number
            maxRequests: number
            message?: string
        }
        adaptive?: boolean
    }

    // Security headers configuration
    headers?: {
        enabled: boolean
        csp?: string
        customHeaders?: Record<string, string>
    }

    // CORS configuration
    cors?: {
        enabled: boolean
        origins?: string[]
        credentials?: boolean
    }

    // Input validation configuration
    validation?: {
        enabled: boolean
        options?: SecurityValidationOptions
        schema?: z.ZodSchema
    }

    // Session management configuration
    session?: {
        enabled: boolean
        requireAuth?: boolean
        allowedRoles?: string[]
    }

    // Audit logging configuration
    audit?: {
        enabled: boolean
        logRequests?: boolean
        logResponses?: boolean
        sensitiveEndpoints?: string[]
    }

    // DDoS protection
    ddosProtection?: {
        enabled: boolean
        threshold?: number
        windowMs?: number
    }

    // Skip middleware for certain paths
    skipPaths?: string[]
}

/**
 * Default security middleware configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
    rateLimit: {
        enabled: true,
        config: 'api',
        adaptive: true
    },
    headers: {
        enabled: true
    },
    cors: {
        enabled: true,
        credentials: true
    },
    validation: {
        enabled: true,
        options: {
            checkSqlInjection: true,
            checkXss: true,
            checkPathTraversal: true,
            checkCommandInjection: true,
            sanitizeInput: true,
            maxLength: 10000
        }
    },
    session: {
        enabled: false, // Disabled by default, enable per route
        requireAuth: false
    },
    audit: {
        enabled: true,
        logRequests: true,
        logResponses: false,
        sensitiveEndpoints: ['/api/auth/', '/api/admin/', '/api/donors/profile']
    },
    ddosProtection: {
        enabled: true,
        threshold: 100,
        windowMs: 60000
    },
    skipPaths: ['/api/health', '/_next/', '/favicon.ico']
}

/**
 * Comprehensive security middleware
 */
export function createSecurityMiddleware(config: SecurityMiddlewareConfig = DEFAULT_SECURITY_CONFIG) {
    // Merge with defaults
    const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config }

    // Create rate limiter
    let rateLimiter: ((request: NextRequest) => Promise<NextResponse | null>) | null = null
    if (finalConfig.rateLimit?.enabled) {
        if (finalConfig.rateLimit.adaptive) {
            rateLimiter = adaptiveRateLimit.createMiddleware()
        } else {
            const rateConfig = finalConfig.rateLimit.config === 'custom'
                ? finalConfig.rateLimit.customConfig!
                : RATE_LIMIT_CONFIGS[finalConfig.rateLimit.config]

            rateLimiter = createRateLimit(rateConfig)
        }
    }

    // Create validation middleware
    let validationMiddleware: ((request: NextRequest) => Promise<{ isValid: boolean; data?: any; response?: NextResponse }>) | null = null
    if (finalConfig.validation?.enabled) {
        validationMiddleware = createValidationMiddleware(
            finalConfig.validation.schema,
            finalConfig.validation.options
        )
    }

    return async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
        const startTime = Date.now()
        const { pathname } = request.nextUrl
        const method = request.method

        try {
            // Skip middleware for certain paths
            if (finalConfig.skipPaths?.some(path => pathname.startsWith(path))) {
                return NextResponse.next()
            }

            // Handle preflight requests
            if (method === 'OPTIONS' && finalConfig.cors?.enabled) {
                const response = new NextResponse(null, { status: 200 })
                return applyCORSHeaders(request, response, {
                    ...DEFAULT_CORS_CONFIG,
                    origin: finalConfig.cors.origins || DEFAULT_CORS_CONFIG.origin,
                    credentials: finalConfig.cors.credentials ?? DEFAULT_CORS_CONFIG.credentials
                })
            }

            // DDoS protection
            if (finalConfig.ddosProtection?.enabled) {
                const ddosResult = await checkDDoSProtection(request, finalConfig.ddosProtection)
                if (ddosResult) {
                    return ddosResult
                }
            }

            // Rate limiting
            if (rateLimiter) {
                const rateLimitResult = await rateLimiter(request)
                if (rateLimitResult) {
                    // Log rate limit violation
                    await EnhancedAuditService.logSecurityEvent({
                        type: 'SECURITY_VIOLATION',
                        severity: 'MEDIUM',
                        action: 'RATE_LIMIT_EXCEEDED',
                        resource: pathname,
                        ipAddress: getClientIP(request),
                        userAgent: request.headers.get('user-agent') || 'unknown',
                        details: {
                            method,
                            path: pathname,
                            rateLimitConfig: finalConfig.rateLimit?.config
                        }
                    }, request)

                    return rateLimitResult
                }
            }

            // Session validation (if required)
            let sessionData: any = null
            if (finalConfig.session?.enabled) {
                const sessionResult = await validateSession(request, finalConfig.session)
                if (sessionResult.response) {
                    return sessionResult.response
                }
                sessionData = sessionResult.session
            }

            // Input validation
            if (validationMiddleware && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                const validationResult = await validationMiddleware(request)
                if (!validationResult.isValid && validationResult.response) {
                    return validationResult.response
                }
                // validatedData would be used here for further processing
            }

            // Audit logging for sensitive endpoints
            if (finalConfig.audit?.enabled && finalConfig.audit.logRequests) {
                const isSensitive = finalConfig.audit.sensitiveEndpoints?.some(endpoint =>
                    pathname.startsWith(endpoint)
                )

                if (isSensitive || finalConfig.audit.logRequests) {
                    await EnhancedAuditService.logActivity({
                        userId: sessionData?.userId,
                        sessionId: sessionData?.sessionId,
                        action: 'API_REQUEST',
                        path: pathname,
                        method,
                        metadata: {
                            sensitive: isSensitive,
                            userAgent: request.headers.get('user-agent'),
                            referer: request.headers.get('referer'),
                            contentType: request.headers.get('content-type'),
                            startTime
                        }
                    })
                }
            }

            // Create response
            const response = NextResponse.next()

            // Apply security headers
            if (finalConfig.headers?.enabled) {
                applySecurityHeaders(response, {
                    ...DEFAULT_SECURITY_HEADERS,
                    contentSecurityPolicy: finalConfig.headers.csp || DEFAULT_SECURITY_HEADERS.contentSecurityPolicy
                })

                // Apply custom headers
                if (finalConfig.headers.customHeaders) {
                    Object.entries(finalConfig.headers.customHeaders).forEach(([key, value]) => {
                        response.headers.set(key, value)
                    })
                }
            }

            // Apply CORS headers
            if (finalConfig.cors?.enabled) {
                applyCORSHeaders(request, response, {
                    ...DEFAULT_CORS_CONFIG,
                    origin: finalConfig.cors.origins || DEFAULT_CORS_CONFIG.origin,
                    credentials: finalConfig.cors.credentials ?? DEFAULT_CORS_CONFIG.credentials
                })
            }

            // Add security context to response headers (for debugging)
            if (process.env.NODE_ENV === 'development') {
                response.headers.set('X-Security-Middleware', 'enabled')
                response.headers.set('X-Request-ID', generateRequestId())
            }

            return response

        } catch (error) {
            console.error('Security middleware error:', error)

            // Log security middleware error
            await EnhancedAuditService.logSecurityEvent({
                type: 'SYSTEM',
                severity: 'HIGH',
                action: 'MIDDLEWARE_ERROR',
                resource: pathname,
                ipAddress: getClientIP(request),
                userAgent: request.headers.get('user-agent') || 'unknown',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    method,
                    path: pathname
                }
            }, request)

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
 * Create route-specific security middleware
 */
export function createRouteSecurityMiddleware(routeConfig: {
    path: string
    config: SecurityMiddlewareConfig
}) {
    const middleware = createSecurityMiddleware(routeConfig.config)

    return async function routeSecurityMiddleware(request: NextRequest): Promise<NextResponse> {
        // Only apply to specific route
        if (!request.nextUrl.pathname.startsWith(routeConfig.path)) {
            return NextResponse.next()
        }

        return await middleware(request)
    }
}

/**
 * Validate session for protected routes
 */
async function validateSession(
    request: NextRequest,
    sessionConfig: NonNullable<SecurityMiddlewareConfig['session']>
): Promise<{ session?: any; response?: NextResponse }> {
    if (!sessionConfig.requireAuth) {
        return {}
    }

    // Check Supabase session
    const supabaseResult = await SupabaseSessionManager.validateSupabaseSession(request)

    if (!supabaseResult.isValid) {
        await EnhancedAuditService.logAuthenticationEvent(
            'LOGIN_FAILURE',
            undefined,
            { reason: supabaseResult.error },
            request
        )

        return {
            response: NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: 'Authentication required'
                    }
                },
                { status: 401 }
            )
        }
    }

    // Check role-based access
    if (sessionConfig.allowedRoles && sessionConfig.allowedRoles.length > 0) {
        const userRole = supabaseResult.user?.user_metadata?.role || 'donor'

        if (!sessionConfig.allowedRoles.includes(userRole)) {
            await EnhancedAuditService.logAuthorizationEvent(
                'ACCESS_DENIED',
                supabaseResult.user?.id,
                request.nextUrl.pathname,
                `role:${sessionConfig.allowedRoles.join('|')}`,
                request
            )

            return {
                response: NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'INSUFFICIENT_PERMISSIONS',
                            message: 'Insufficient permissions'
                        }
                    },
                    { status: 403 }
                )
            }
        }
    }

    return {
        session: {
            userId: supabaseResult.user?.id,
            userRole: supabaseResult.user?.user_metadata?.role || 'donor',
            email: supabaseResult.user?.email
        }
    }
}

/**
 * DDoS protection check
 */
async function checkDDoSProtection(
    request: NextRequest,
    config: NonNullable<SecurityMiddlewareConfig['ddosProtection']>
): Promise<NextResponse | null> {
    const ip = getClientIP(request)
    const now = Date.now()
    const windowMs = config.windowMs || 60000
    const threshold = config.threshold || 100

    // Simple in-memory tracking (use Redis in production)
    const key = `ddos:${ip}`
    const stored = ddosTracker.get(key)

    if (!stored || now - stored.firstRequest > windowMs) {
        ddosTracker.set(key, { count: 1, firstRequest: now })
        return null
    }

    stored.count++

    if (stored.count > threshold) {
        await EnhancedAuditService.logSecurityEvent({
            type: 'SECURITY_VIOLATION',
            severity: 'CRITICAL',
            action: 'DDOS_DETECTED',
            resource: 'system',
            ipAddress: ip,
            userAgent: request.headers.get('user-agent') || 'unknown',
            details: {
                requestCount: stored.count,
                threshold,
                windowMs,
                path: request.nextUrl.pathname
            }
        }, request)

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

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')

    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }

    if (realIP) {
        return realIP
    }

    return 'unknown'
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// DDoS tracking store (use Redis in production)
const ddosTracker = new Map<string, { count: number; firstRequest: number }>()

// Cleanup expired DDoS entries every 5 minutes
if (typeof window === 'undefined') {
    setInterval(() => {
        const now = Date.now()
        const expiredKeys: string[] = []

        for (const [key, value] of ddosTracker.entries()) {
            if (now - value.firstRequest > 60000) { // 1 minute
                expiredKeys.push(key)
            }
        }

        expiredKeys.forEach(key => ddosTracker.delete(key))
    }, 5 * 60 * 1000)
}

/**
 * Pre-configured security middleware for common use cases
 */
export const SecurityMiddlewares = {
    // Basic API security
    api: createSecurityMiddleware({
        rateLimit: { enabled: true, config: 'api' },
        headers: { enabled: true },
        cors: { enabled: true },
        validation: { enabled: true },
        audit: { enabled: true, logRequests: true }
    }),

    // Authentication endpoints
    auth: createSecurityMiddleware({
        rateLimit: { enabled: true, config: 'auth', adaptive: true },
        headers: { enabled: true },
        cors: { enabled: true },
        validation: { enabled: true },
        audit: { enabled: true, logRequests: true, logResponses: true }
    }),

    // Admin endpoints
    admin: createSecurityMiddleware({
        rateLimit: { enabled: true, config: 'api' },
        headers: { enabled: true },
        cors: { enabled: true },
        validation: { enabled: true },
        session: { enabled: true, requireAuth: true, allowedRoles: ['admin', 'system_admin'] },
        audit: { enabled: true, logRequests: true, logResponses: true }
    }),

    // Public endpoints (minimal security)
    public: createSecurityMiddleware({
        rateLimit: { enabled: true, config: 'api' },
        headers: { enabled: true },
        cors: { enabled: true },
        validation: { enabled: false },
        audit: { enabled: false }
    }),

    // File upload endpoints
    upload: createSecurityMiddleware({
        rateLimit: { enabled: true, config: 'upload' },
        headers: { enabled: true },
        cors: { enabled: true },
        validation: { enabled: true },
        session: { enabled: true, requireAuth: true },
        audit: { enabled: true, logRequests: true }
    })
}