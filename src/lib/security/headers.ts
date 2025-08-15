import { NextRequest, NextResponse } from 'next/server'

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
    contentSecurityPolicy?: string
    strictTransportSecurity?: string
    xFrameOptions?: string
    xContentTypeOptions?: string
    referrerPolicy?: string
    permissionsPolicy?: string
    crossOriginEmbedderPolicy?: string
    crossOriginOpenerPolicy?: string
    crossOriginResourcePolicy?: string
}

/**
 * Default security headers
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
    ].join('; '),

    // HTTP Strict Transport Security - forces HTTPS
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',

    // X-Frame-Options - prevents clickjacking
    xFrameOptions: 'DENY',

    // X-Content-Type-Options - prevents MIME type sniffing
    xContentTypeOptions: 'nosniff',

    // Referrer Policy - controls referrer information
    referrerPolicy: 'strict-origin-when-cross-origin',

    // Permissions Policy - controls browser features
    permissionsPolicy: [
        'camera=()',
        'microphone=()',
        'geolocation=(self)',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'encrypted-media=()',
        'fullscreen=(self)',
        'picture-in-picture=()'
    ].join(', '),

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: 'require-corp',

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: 'same-origin',

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: 'same-origin'
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
    response: NextResponse,
    config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): NextResponse {
    // Content Security Policy
    if (config.contentSecurityPolicy) {
        response.headers.set('Content-Security-Policy', config.contentSecurityPolicy)
    }

    // HTTP Strict Transport Security
    if (config.strictTransportSecurity) {
        response.headers.set('Strict-Transport-Security', config.strictTransportSecurity)
    }

    // X-Frame-Options
    if (config.xFrameOptions) {
        response.headers.set('X-Frame-Options', config.xFrameOptions)
    }

    // X-Content-Type-Options
    if (config.xContentTypeOptions) {
        response.headers.set('X-Content-Type-Options', config.xContentTypeOptions)
    }

    // Referrer Policy
    if (config.referrerPolicy) {
        response.headers.set('Referrer-Policy', config.referrerPolicy)
    }

    // Permissions Policy
    if (config.permissionsPolicy) {
        response.headers.set('Permissions-Policy', config.permissionsPolicy)
    }

    // Cross-Origin Embedder Policy
    if (config.crossOriginEmbedderPolicy) {
        response.headers.set('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy)
    }

    // Cross-Origin Opener Policy
    if (config.crossOriginOpenerPolicy) {
        response.headers.set('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy)
    }

    // Cross-Origin Resource Policy
    if (config.crossOriginResourcePolicy) {
        response.headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy)
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off')
    response.headers.set('X-Download-Options', 'noopen')
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
    response.headers.set('X-XSS-Protection', '1; mode=block')

    return response
}

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(config?: SecurityHeadersConfig) {
    return function securityHeadersMiddleware(_request: NextRequest): NextResponse {
        const response = NextResponse.next()
        return applySecurityHeaders(response, config)
    }
}

/**
 * CORS configuration for API endpoints
 */
export interface CORSConfig {
    origin?: string | string[] | boolean
    methods?: string[]
    allowedHeaders?: string[]
    exposedHeaders?: string[]
    credentials?: boolean
    maxAge?: number
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com']
        : true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
    ],
    exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(
    request: NextRequest,
    response: NextResponse,
    config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse {
    const origin = request.headers.get('origin')

    // Handle origin
    if (config.origin === true) {
        response.headers.set('Access-Control-Allow-Origin', '*')
    } else if (typeof config.origin === 'string') {
        response.headers.set('Access-Control-Allow-Origin', config.origin)
    } else if (Array.isArray(config.origin) && origin) {
        if (config.origin.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin)
        }
    }

    // Handle methods
    if (config.methods) {
        response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '))
    }

    // Handle allowed headers
    if (config.allowedHeaders) {
        response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))
    }

    // Handle exposed headers
    if (config.exposedHeaders) {
        response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
    }

    // Handle credentials
    if (config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle max age
    if (config.maxAge) {
        response.headers.set('Access-Control-Max-Age', config.maxAge.toString())
    }

    return response
}

/**
 * Create CORS middleware
 */
export function createCORSMiddleware(config?: CORSConfig) {
    return function corsMiddleware(request: NextRequest): NextResponse {
        const response = NextResponse.next()
        return applyCORSHeaders(request, response, config)
    }
}

/**
 * Handle preflight OPTIONS requests
 */
export function handlePreflightRequest(request: NextRequest, config?: CORSConfig): NextResponse {
    const response = new NextResponse(null, { status: 200 })
    return applyCORSHeaders(request, response, config)
}

/**
 * Security middleware that combines multiple security measures
 */
export function createSecurityMiddleware(options?: {
    securityHeaders?: SecurityHeadersConfig
    cors?: CORSConfig
    skipPaths?: string[]
}) {
    const { securityHeaders, cors, skipPaths = [] } = options || {}

    return function securityMiddleware(request: NextRequest): NextResponse {
        const { pathname } = request.nextUrl

        // Skip security middleware for certain paths
        if (skipPaths.some(path => pathname.startsWith(path))) {
            return NextResponse.next()
        }

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return handlePreflightRequest(request, cors)
        }

        // Create response
        const response = NextResponse.next()

        // Apply security headers
        applySecurityHeaders(response, securityHeaders)

        // Apply CORS headers
        applyCORSHeaders(request, response, cors)

        return response
    }
}