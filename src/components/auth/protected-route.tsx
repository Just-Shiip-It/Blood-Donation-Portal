'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/auth/utils'

interface ProtectedRouteProps {
    children: React.ReactNode
    requiredRoles?: UserRole[]
    requiredPermissions?: string[]
    fallbackUrl?: string
    loadingComponent?: React.ReactNode
    unauthorizedComponent?: React.ReactNode
}

interface AuthState {
    isLoading: boolean
    isAuthenticated: boolean
    user: {
        id: string
        email: string
        role: UserRole
        emailVerified: boolean
        isActive: boolean
    } | null
    error: string | null
}

export function ProtectedRoute({
    children,
    requiredRoles = [],
    requiredPermissions = [],
    fallbackUrl = '/login',
    loadingComponent,
    unauthorizedComponent
}: ProtectedRouteProps) {
    const [authState, setAuthState] = useState<AuthState>({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        error: null
    })

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        checkAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await checkAuth()
                } else if (event === 'SIGNED_OUT') {
                    setAuthState({
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        error: null
                    })
                }
            }
        )

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const checkAuth = async () => {
        try {
            setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: false,
                    user: null,
                    error: sessionError?.message || 'No active session'
                })
                return
            }

            // Get user profile from our API with timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

            try {
                const response = await fetch('/api/auth/profile', {
                    signal: controller.signal
                })
                clearTimeout(timeoutId)

                const result = await response.json()

                if (!result.success || !result.data?.user) {
                    setAuthState({
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        error: result.error?.message || 'Failed to load user profile'
                    })
                    return
                }

                const user = result.data.user

                // Check if user account is active
                if (!user.isActive) {
                    setAuthState({
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        error: 'Account is disabled'
                    })
                    return
                }

                setAuthState({
                    isLoading: false,
                    isAuthenticated: true,
                    user,
                    error: null
                })
            } catch (fetchError) {
                clearTimeout(timeoutId)
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    console.error('Auth check timeout')
                    setAuthState({
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        error: 'Authentication check timed out'
                    })
                } else {
                    throw fetchError
                }
            }

        } catch (error) {
            console.error('Auth check error:', error)
            setAuthState({
                isLoading: false,
                isAuthenticated: false,
                user: null,
                error: 'Authentication check failed'
            })
        }
    }

    // Show loading state
    if (authState.isLoading) {
        if (loadingComponent) {
            return <>{loadingComponent}</>
        }

        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying authentication...</p>
                    <p className="mt-2 text-sm text-gray-500">This should only take a moment</p>

                    {/* Development helper - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                        <button
                            onClick={() => {
                                console.log('Skipping auth check for development')
                                setAuthState({
                                    isLoading: false,
                                    isAuthenticated: true,
                                    user: {
                                        id: 'dev-user',
                                        email: 'dev@example.com',
                                        role: 'donor',
                                        emailVerified: true,
                                        isActive: true
                                    },
                                    error: null
                                })
                            }}
                            className="mt-4 px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                        >
                            Skip (Dev Only)
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Handle unauthenticated users
    if (!authState.isAuthenticated || !authState.user) {
        // Redirect to login with return URL
        const currentPath = window.location.pathname
        const loginUrl = `${fallbackUrl}?redirectTo=${encodeURIComponent(currentPath)}`
        router.push(loginUrl)

        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600">Redirecting to login...</p>
                </div>
            </div>
        )
    }

    // Check role requirements
    if (requiredRoles.length > 0 && !requiredRoles.includes(authState.user.role)) {
        if (unauthorizedComponent) {
            return <>{unauthorizedComponent}</>
        }

        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-4">
                        You don&apos;t have permission to access this page.
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    // Check permission requirements (simplified - would need full implementation)
    if (requiredPermissions.length > 0) {
        // This would require implementing the full permission checking logic
        // For now, we'll just check basic role-based permissions
        const hasRequiredPermissions = requiredPermissions.every(permission => {
            // Basic permission check based on role
            const [resource, action] = permission.split(':')

            switch (authState.user!.role) {
                case 'system_admin':
                    return true // System admin has all permissions
                case 'admin':
                    return !permission.startsWith('system:')
                case 'facility':
                    return ['appointments', 'donations', 'blood-requests'].includes(resource)
                case 'donor':
                    return ['profile', 'appointments', 'donations'].includes(resource) &&
                        ['read', 'create', 'update'].includes(action)
                default:
                    return false
            }
        })

        if (!hasRequiredPermissions) {
            if (unauthorizedComponent) {
                return <>{unauthorizedComponent}</>
            }

            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-gray-600 mb-4">
                            You don&apos;t have the required permissions to access this page.
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            )
        }
    }

    // User is authenticated and authorized
    return <>{children}</>
}

// Hook to use auth state in components
export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        isLoading: true,
        isAuthenticated: false,
        user: null,
        error: null
    })

    const supabase = createClient()

    const checkAuth = useCallback(async () => {
        try {
            setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: false,
                    user: null,
                    error: sessionError?.message || 'No active session'
                })
                return
            }

            const response = await fetch('/api/auth/profile')
            const result = await response.json()

            if (!result.success || !result.data?.user) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: false,
                    user: null,
                    error: result.error?.message || 'Failed to load user profile'
                })
                return
            }

            const user = result.data.user

            if (!user.isActive) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: false,
                    user: null,
                    error: 'Account is disabled'
                })
                return
            }

            setAuthState({
                isLoading: false,
                isAuthenticated: true,
                user,
                error: null
            })

        } catch (error) {
            console.error('Auth check error:', error)
            setAuthState({
                isLoading: false,
                isAuthenticated: false,
                user: null,
                error: 'Authentication check failed'
            })
        }
    }, [supabase])

    useEffect(() => {
        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await checkAuth()
                } else if (event === 'SIGNED_OUT') {
                    setAuthState({
                        isLoading: false,
                        isAuthenticated: false,
                        user: null,
                        error: null
                    })
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [checkAuth, supabase.auth])

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            await supabase.auth.signOut()
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return {
        ...authState,
        logout,
        refetch: checkAuth
    }
}