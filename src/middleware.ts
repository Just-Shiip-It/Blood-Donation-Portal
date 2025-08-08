import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

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

export async function middleware(request: NextRequest) {
    // First, update the session
    const supabaseResponse = await updateSession(request)

    const { pathname } = request.nextUrl

    // Skip middleware for API routes, static files, and public routes
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.includes('.') ||
        PUBLIC_ROUTES.includes(pathname)
    ) {
        return supabaseResponse
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

    return supabaseResponse
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