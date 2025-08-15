import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSecureToken } from './encryption'
import { AuditService } from '@/lib/services/audit'

// Session storage (in production, use Redis or database)
const sessionStore = new Map<string, SessionData>()

export interface SessionData {
    userId: string
    userRole: string
    email: string
    ipAddress: string
    userAgent: string
    createdAt: Date
    lastActivity: Date
    isActive: boolean
    metadata?: Record<string, unknown>
}

export interface SessionConfig {
    maxAge: number // Session duration in milliseconds
    maxInactivity: number // Max inactivity period in milliseconds
    maxConcurrentSessions: number // Max sessions per user
    requireSecure: boolean // Require HTTPS
    sameSite: 'strict' | 'lax' | 'none'
}

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxInactivity: 2 * 60 * 60 * 1000, // 2 hours
    maxConcurrentSessions: 3, // 3 concurrent sessions
    requireSecure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
}

/**
 * Session manager class
 */
export class SessionManager {
    private config: SessionConfig

    constructor(config: SessionConfig = DEFAULT_SESSION_CONFIG) {
        this.config = config
    }

    /**
     * Create a new session
     */
    async createSession(
        userId: string,
        userRole: string,
        email: string,
        request: NextRequest
    ): Promise<string> {
        const sessionId = generateSecureToken(32)
        const ipAddress = this.getClientIP(request)
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Check for existing sessions and enforce limits
        await this.enforceSessionLimits(userId)

        const sessionData: SessionData = {
            userId,
            userRole,
            email,
            ipAddress,
            userAgent,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true
        }

        sessionStore.set(sessionId, sessionData)

        // Log session creation
        await AuditService.logAudit({
            userId,
            action: 'SESSION_CREATE',
            resource: 'session',
            resourceId: sessionId,
            ipAddress,
            userAgent,
            metadata: { sessionId }
        })

        return sessionId
    }

    /**
     * Validate and refresh session
     */
    async validateSession(sessionId: string, request: NextRequest): Promise<SessionData | null> {
        const session = sessionStore.get(sessionId)

        if (!session) {
            return null
        }

        const now = new Date()
        const timeSinceCreation = now.getTime() - session.createdAt.getTime()
        const timeSinceActivity = now.getTime() - session.lastActivity.getTime()

        // Check if session has expired
        if (timeSinceCreation > this.config.maxAge) {
            await this.destroySession(sessionId, 'EXPIRED')
            return null
        }

        // Check if session is inactive
        if (timeSinceActivity > this.config.maxInactivity) {
            await this.destroySession(sessionId, 'INACTIVE')
            return null
        }

        // Check if session is still active
        if (!session.isActive) {
            return null
        }

        // Validate IP address (optional security check)
        const currentIP = this.getClientIP(request)
        if (session.ipAddress !== currentIP) {
            // Log suspicious activity
            await AuditService.logAudit({
                userId: session.userId,
                action: 'SESSION_IP_MISMATCH',
                resource: 'session',
                resourceId: sessionId,
                ipAddress: currentIP,
                userAgent: request.headers.get('user-agent') || 'unknown',
                metadata: {
                    originalIP: session.ipAddress,
                    currentIP,
                    sessionId
                }
            })

            // Optionally destroy session on IP mismatch
            // await this.destroySession(sessionId, 'IP_MISMATCH')
            // return null
        }

        // Update last activity
        session.lastActivity = now
        sessionStore.set(sessionId, session)

        return session
    }

    /**
     * Destroy a session
     */
    async destroySession(sessionId: string, reason: string = 'LOGOUT'): Promise<void> {
        const session = sessionStore.get(sessionId)

        if (session) {
            // Log session destruction
            await AuditService.logAudit({
                userId: session.userId,
                action: 'SESSION_DESTROY',
                resource: 'session',
                resourceId: sessionId,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                metadata: { reason, sessionId }
            })

            sessionStore.delete(sessionId)
        }
    }

    /**
     * Destroy all sessions for a user
     */
    async destroyAllUserSessions(userId: string, reason: string = 'LOGOUT_ALL'): Promise<void> {
        const userSessions = Array.from(sessionStore.entries())
            .filter(([, session]) => session.userId === userId)

        for (const [sessionId] of userSessions) {
            await this.destroySession(sessionId, reason)
        }
    }

    /**
     * Get all active sessions for a user
     */
    getUserSessions(userId: string): Array<{ sessionId: string; data: SessionData }> {
        return Array.from(sessionStore.entries())
            .filter(([, session]) => session.userId === userId && session.isActive)
            .map(([sessionId, data]) => ({ sessionId, data }))
    }

    /**
     * Enforce session limits per user
     */
    private async enforceSessionLimits(userId: string): Promise<void> {
        const userSessions = this.getUserSessions(userId)

        if (userSessions.length >= this.config.maxConcurrentSessions) {
            // Sort by last activity and remove oldest sessions
            userSessions.sort((a, b) =>
                a.data.lastActivity.getTime() - b.data.lastActivity.getTime()
            )

            const sessionsToRemove = userSessions.slice(0,
                userSessions.length - this.config.maxConcurrentSessions + 1
            )

            for (const { sessionId } of sessionsToRemove) {
                await this.destroySession(sessionId, 'SESSION_LIMIT_EXCEEDED')
            }
        }
    }

    /**
     * Get client IP address
     */
    private getClientIP(request: NextRequest): string {
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
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): void {
        const now = new Date()
        const expiredSessions: string[] = []

        for (const [sessionId, session] of sessionStore.entries()) {
            const timeSinceCreation = now.getTime() - session.createdAt.getTime()
            const timeSinceActivity = now.getTime() - session.lastActivity.getTime()

            if (timeSinceCreation > this.config.maxAge ||
                timeSinceActivity > this.config.maxInactivity) {
                expiredSessions.push(sessionId)
            }
        }

        for (const sessionId of expiredSessions) {
            this.destroySession(sessionId, 'CLEANUP')
        }
    }

    /**
     * Get session statistics
     */
    getSessionStats(): {
        totalSessions: number
        activeSessions: number
        userCounts: Record<string, number>
    } {
        const totalSessions = sessionStore.size
        let activeSessions = 0
        const userCounts: Record<string, number> = {}

        for (const session of sessionStore.values()) {
            if (session.isActive) {
                activeSessions++
            }

            userCounts[session.userId] = (userCounts[session.userId] || 0) + 1
        }

        return {
            totalSessions,
            activeSessions,
            userCounts
        }
    }
}

// Global session manager instance
export const sessionManager = new SessionManager()

/**
 * Session middleware for API routes
 */
export function createSessionMiddleware(config?: Partial<SessionConfig>) {
    const manager = new SessionManager({ ...DEFAULT_SESSION_CONFIG, ...config })

    return async function sessionMiddleware(request: NextRequest): Promise<{
        session: SessionData | null
        response?: NextResponse
    }> {
        const sessionId = request.cookies.get('session_id')?.value

        if (!sessionId) {
            return { session: null }
        }

        const session = await manager.validateSession(sessionId, request)

        if (!session) {
            // Invalid session, clear cookie
            const response = NextResponse.next()
            response.cookies.delete('session_id')
            return { session: null, response }
        }

        return { session }
    }
}

/**
 * Set session cookie
 */
export function setSessionCookie(
    response: NextResponse,
    sessionId: string,
    config: SessionConfig = DEFAULT_SESSION_CONFIG
): void {
    response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: config.requireSecure,
        sameSite: config.sameSite,
        maxAge: Math.floor(config.maxAge / 1000), // Convert to seconds
        path: '/'
    })
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: NextResponse): void {
    response.cookies.delete('session_id')
}

/**
 * Enhanced Supabase session management
 */
export class SupabaseSessionManager {
    /**
     * Validate Supabase session and sync with our session store
     */
    static async validateSupabaseSession(_request: NextRequest): Promise<{
        isValid: boolean
        user?: any
        session?: any
        error?: string
    }> {
        try {
            const supabase = await createClient()
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error || !user) {
                return {
                    isValid: false,
                    error: error?.message || 'No valid session'
                }
            }

            // Get session separately
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError || !session) {
                return {
                    isValid: false,
                    error: sessionError?.message || 'No valid session'
                }
            }

            // Check if session is expired
            if (session.expires_at && session.expires_at * 1000 < Date.now()) {
                return {
                    isValid: false,
                    error: 'Session expired'
                }
            }

            return {
                isValid: true,
                user,
                session
            }

        } catch (error) {
            console.error('Session validation error:', error)
            return {
                isValid: false,
                error: 'Session validation failed'
            }
        }
    }

    /**
     * Refresh Supabase session
     */
    static async refreshSession(_request: NextRequest): Promise<{
        success: boolean
        session?: any
        error?: string
    }> {
        try {
            const supabase = await createClient()
            const { data, error } = await supabase.auth.refreshSession()

            if (error || !data.session) {
                return {
                    success: false,
                    error: error?.message || 'Failed to refresh session'
                }
            }

            return {
                success: true,
                session: data.session
            }

        } catch (error) {
            console.error('Session refresh error:', error)
            return {
                success: false,
                error: 'Session refresh failed'
            }
        }
    }
}

// Cleanup expired sessions every 15 minutes
if (typeof window === 'undefined') { // Server-side only
    setInterval(() => {
        sessionManager.cleanupExpiredSessions()
    }, 15 * 60 * 1000)
}