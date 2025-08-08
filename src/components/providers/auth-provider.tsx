'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/auth/utils'

interface AuthUser {
    id: string
    email: string
    role: UserRole
    emailVerified: boolean
    isActive: boolean
}

interface AuthContextType {
    user: AuthUser | null
    isLoading: boolean
    isAuthenticated: boolean
    error: string | null
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    useEffect(() => {
        // Check initial auth state
        checkAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await checkAuth()
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setIsLoading(false)
                    setError(null)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const checkAuth = async () => {
        try {
            setIsLoading(true)
            setError(null)

            // Get current session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                setUser(null)
                setIsLoading(false)
                return
            }

            // Get user profile from our API
            const response = await fetch('/api/auth/profile')
            const result = await response.json()

            if (!result.success || !result.data?.user) {
                setUser(null)
                setError(result.error?.message || 'Failed to load user profile')
                setIsLoading(false)
                return
            }

            const userData = result.data.user

            // Check if user account is active
            if (!userData.isActive) {
                setUser(null)
                setError('Account is disabled')
                setIsLoading(false)
                return
            }

            setUser(userData)
            setIsLoading(false)

        } catch (error) {
            console.error('Auth check error:', error)
            setUser(null)
            setError('Authentication check failed')
            setIsLoading(false)
        }
    }

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            const result = await response.json()

            if (!result.success) {
                setError(result.error?.message || 'Login failed')
                setIsLoading(false)
                return { success: false, error: result.error?.message || 'Login failed' }
            }

            // Auth state will be updated by the onAuthStateChange listener
            return { success: true }

        } catch (error) {
            console.error('Login error:', error)
            const errorMessage = 'An unexpected error occurred'
            setError(errorMessage)
            setIsLoading(false)
            return { success: false, error: errorMessage }
        }
    }

    const logout = async () => {
        try {
            setIsLoading(true)

            // Call our logout API
            await fetch('/api/auth/logout', { method: 'POST' })

            // Sign out from Supabase
            await supabase.auth.signOut()

            // Auth state will be updated by the onAuthStateChange listener

        } catch (error) {
            console.error('Logout error:', error)
            setError('Logout failed')
        } finally {
            setIsLoading(false)
        }
    }

    const refetch = async () => {
        await checkAuth()
    }

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        logout,
        refetch
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}