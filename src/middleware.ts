import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { applySecurityHeaders, DEFAULT_SECURITY_HEADERS } from '@/lib/security/headers'

// Define protected routes and their required roles
const PROTECTED_ROUTES = {
    '/dashboard': ['donor', 'admin', 'facility', 'system_admin'],
    '/admin': ['admin', 'system_admin'],
    '/system': ['system_admin'],
    '/profile': ['donor', 'admin', 'facility', 'system_admin'],
    '/appointments': ['donor', 'admin', 'facility'],
    '/donations': ['donor', 'admin', 'facility'],
    '/blood-requests': ['admin', 'facility', 'system_admin'],
    '/reports': ['admin', 'system_admin']
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/about',
    '/contact'
]

// Simple rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function simpleRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Apply basic rate limiting for API routes
    if (pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

        if (!simpleRateLimit(ip)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'Too many requests'
                    }
                },
                { status: 429 }
            )
        }

        // Apply security headers to API responses
        const response = NextResponse.next()
        applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)
        return response
    }

    // Apply basic security headers to all non-API routes
    const response = await updateSession(request)
    applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)

    // Skip authentication for static files and public routes
    if (
        pathname.startsWith('/_next/') ||
        pathname.includes('.') ||
        PUBLIC_ROUTES.includes(pathname)
    ) {
        return response
    }

    // Create Supabase client for middleware
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                },
            },
        }
    )

    // Get the current user
    const { data: { user }, error } = await supabase.auth.getUser()

    // If no user and trying to access protected route, redirect to login
    if (!user || error) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Check if the route requires specific roles
    const requiredRoles = getRequiredRoles(pathname)
    if (requiredRoles.length > 0) {
        // Get user role from metadata or make a database call
        const userRole = user.user_metadata?.role || 'donor'

        if (!requiredRoles.includes(userRole)) {
            // Redirect to unauthorized page or dashboard based on role
            const redirectUrl = userRole === 'donor' ? '/dashboard' : '/admin'
            return NextResponse.redirect(new URL(redirectUrl, request.url))
        }
    }

    applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)
    return response
}

function getRequiredRoles(pathname: string): string[] {
    // Check exact matches first
    if (PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]) {
        return PROTECTED_ROUTES[pathname as keyof typeof PROTECTED_ROUTES]
    }

    // Check for pattern matches
    for (const [route, roles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(route)) {
            return roles
        }
    }

    return []
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}