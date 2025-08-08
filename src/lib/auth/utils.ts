import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type UserRole = 'donor' | 'admin' | 'facility' | 'system_admin'

export interface AuthUser {
    id: string
    email: string
    role: UserRole
    emailVerified: boolean
    isActive: boolean
}

export interface AuthResult {
    success: boolean
    user?: AuthUser
    error?: string
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<AuthResult> {
    try {
        const supabase = await createClient()

        // Get current user from Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        // Get user data from our database
        const [userData] = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (!userData) {
            return {
                success: false,
                error: 'User not found in database'
            }
        }

        if (!userData.isActive) {
            return {
                success: false,
                error: 'Account is disabled'
            }
        }

        return {
            success: true,
            user: {
                id: userData.id,
                email: userData.email,
                role: userData.role as UserRole,
                emailVerified: userData.emailVerified ?? false,
                isActive: userData.isActive ?? true
            }
        }

    } catch (error) {
        console.error('Get current user error:', error)
        return {
            success: false,
            error: 'Internal server error'
        }
    }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole)
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(userRole: UserRole): boolean {
    return hasRole(userRole, ['admin', 'system_admin'])
}

/**
 * Check if user has system admin privileges
 */
export function isSystemAdmin(userRole: UserRole): boolean {
    return userRole === 'system_admin'
}

/**
 * Check if user is a donor
 */
export function isDonor(userRole: UserRole): boolean {
    return userRole === 'donor'
}

/**
 * Check if user is a facility
 */
export function isFacility(userRole: UserRole): boolean {
    return userRole === 'facility'
}

/**
 * Role hierarchy for permission checking
 * Higher numbers have more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    'donor': 1,
    'facility': 2,
    'admin': 3,
    'system_admin': 4
}

/**
 * Check if user has sufficient role level
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole]
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(userRole: UserRole): string[] {
    const basePermissions = ['profile:read', 'profile:update']

    switch (userRole) {
        case 'donor':
            return [
                ...basePermissions,
                'appointments:create',
                'appointments:read',
                'appointments:update',
                'donations:read'
            ]

        case 'facility':
            return [
                ...basePermissions,
                'appointments:read',
                'appointments:update',
                'appointments:delete',
                'donations:read',
                'donations:create',
                'blood-requests:read',
                'blood-requests:create',
                'blood-requests:update'
            ]

        case 'admin':
            return [
                ...basePermissions,
                'users:read',
                'users:update',
                'appointments:read',
                'appointments:update',
                'appointments:delete',
                'donations:read',
                'donations:create',
                'donations:update',
                'blood-requests:read',
                'blood-requests:create',
                'blood-requests:update',
                'blood-requests:delete',
                'reports:read'
            ]

        case 'system_admin':
            return [
                ...basePermissions,
                'users:read',
                'users:create',
                'users:update',
                'users:delete',
                'appointments:*',
                'donations:*',
                'blood-requests:*',
                'reports:*',
                'system:*'
            ]

        default:
            return basePermissions
    }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
    const permissions = getUserPermissions(userRole)

    // Check for exact match
    if (permissions.includes(permission)) {
        return true
    }

    // Check for wildcard permissions
    const [resource] = permission.split(':')
    const wildcardPermission = `${resource}:*`

    if (permissions.includes(wildcardPermission)) {
        return true
    }

    // Check for system-wide permissions
    if (permissions.includes('system:*')) {
        return true
    }

    return false
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(): Promise<AuthResult> {
    return await getCurrentUser()
}

/**
 * Middleware helper to require specific roles
 */
export async function requireRoles(requiredRoles: UserRole[]): Promise<AuthResult> {
    const authResult = await getCurrentUser()

    if (!authResult.success || !authResult.user) {
        return authResult
    }

    if (!hasRole(authResult.user.role, requiredRoles)) {
        return {
            success: false,
            error: 'Insufficient permissions'
        }
    }

    return authResult
}

/**
 * Middleware helper to require specific permission
 */
export async function requirePermission(permission: string): Promise<AuthResult> {
    const authResult = await getCurrentUser()

    if (!authResult.success || !authResult.user) {
        return authResult
    }

    if (!hasPermission(authResult.user.role, permission)) {
        return {
            success: false,
            error: 'Insufficient permissions'
        }
    }

    return authResult
}