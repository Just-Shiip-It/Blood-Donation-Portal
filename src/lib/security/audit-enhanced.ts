import { NextRequest } from 'next/server'
import { AuditService } from '@/lib/services/audit'
import { db } from '@/lib/db'
import { auditLogSchema } from '@/lib/db/schema'
import { eq, desc, and, gte, lte, count, sql } from 'drizzle-orm'

export interface SecurityEvent {
    type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'SYSTEM' | 'SECURITY_VIOLATION'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    action: string
    resource: string
    userId?: string
    sessionId?: string
    ipAddress: string
    userAgent: string
    details: Record<string, unknown>
    timestamp?: Date
}

export interface ComplianceEvent {
    eventType: 'DATA_ACCESS' | 'DATA_MODIFICATION' | 'DATA_EXPORT' | 'CONSENT_CHANGE' | 'RETENTION_ACTION'
    dataType: 'PII' | 'PHI' | 'FINANCIAL' | 'BIOMETRIC' | 'GENERAL'
    userId?: string
    dataSubject?: string // The person whose data is being accessed
    legalBasis?: string // GDPR legal basis
    purpose: string
    retention?: {
        category: string
        period: number // in days
        reason: string
    }
    consent?: {
        given: boolean
        timestamp: Date
        version: string
    }
}

/**
 * Enhanced audit service with security and compliance features
 */
export class EnhancedAuditService extends AuditService {
    /**
     * Log security events with enhanced context
     */
    static async logSecurityEvent(event: SecurityEvent, request?: NextRequest): Promise<void> {
        const timestamp = event.timestamp || new Date()

        // Extract additional context from request if provided
        let ipAddress = event.ipAddress
        let userAgent = event.userAgent

        if (request) {
            ipAddress = this.extractIPAddress(request)
            userAgent = request.headers.get('user-agent') || 'unknown'
        }

        // Log to audit table
        await this.logAudit({
            userId: event.userId,
            action: event.action,
            resource: event.resource,
            ipAddress,
            userAgent,
            metadata: {
                securityEvent: true,
                type: event.type,
                severity: event.severity,
                sessionId: event.sessionId,
                details: event.details,
                timestamp: timestamp.toISOString()
            }
        })

        // For critical events, also log to activity table for immediate alerting
        if (event.severity === 'CRITICAL') {
            await this.logActivity({
                userId: event.userId,
                sessionId: event.sessionId,
                action: `CRITICAL_SECURITY_EVENT_${event.action}`,
                path: event.resource,
                metadata: {
                    securityEvent: true,
                    type: event.type,
                    severity: event.severity,
                    details: event.details
                }
            })

            // Trigger immediate alert (implement based on your alerting system)
            await this.triggerSecurityAlert(event, ipAddress, userAgent)
        }
    }

    /**
     * Log compliance events for HIPAA/GDPR requirements
     */
    static async logComplianceEvent(
        event: ComplianceEvent,
        request?: NextRequest
    ): Promise<void> {
        const ipAddress = request ? this.extractIPAddress(request) : 'system'
        const userAgent = request?.headers.get('user-agent') || 'system'

        await this.logAudit({
            userId: event.userId,
            action: `COMPLIANCE_${event.eventType}`,
            resource: event.dataType,
            resourceId: event.dataSubject,
            ipAddress,
            userAgent,
            metadata: {
                complianceEvent: true,
                eventType: event.eventType,
                dataType: event.dataType,
                dataSubject: event.dataSubject,
                legalBasis: event.legalBasis,
                purpose: event.purpose,
                retention: event.retention,
                consent: event.consent
            }
        })
    }

    /**
     * Log data access for compliance tracking
     */
    static async logDataAccess(
        userId: string,
        dataType: ComplianceEvent['dataType'],
        dataSubject: string,
        purpose: string,
        request?: NextRequest
    ): Promise<void> {
        await this.logComplianceEvent({
            eventType: 'DATA_ACCESS',
            dataType,
            userId,
            dataSubject,
            purpose
        }, request)
    }

    /**
     * Log authentication events
     */
    static async logAuthenticationEvent(
        action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'ACCOUNT_LOCKED',
        userId?: string,
        details: Record<string, unknown> = {},
        request?: NextRequest
    ): Promise<void> {
        const severity = action === 'LOGIN_FAILURE' ? 'MEDIUM' : 'LOW'

        await this.logSecurityEvent({
            type: 'AUTHENTICATION',
            severity,
            action,
            resource: 'auth',
            userId,
            ipAddress: request ? this.extractIPAddress(request) : 'unknown',
            userAgent: request?.headers.get('user-agent') || 'unknown',
            details
        }, request)
    }

    /**
     * Log authorization events
     */
    static async logAuthorizationEvent(
        action: 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'PERMISSION_ESCALATION',
        userId: string,
        resource: string,
        requiredPermission: string,
        request?: NextRequest
    ): Promise<void> {
        const severity = action === 'ACCESS_DENIED' ? 'MEDIUM' : 'LOW'

        await this.logSecurityEvent({
            type: 'AUTHORIZATION',
            severity,
            action,
            resource,
            userId,
            ipAddress: request ? this.extractIPAddress(request) : 'unknown',
            userAgent: request?.headers.get('user-agent') || 'unknown',
            details: {
                requiredPermission,
                granted: action === 'ACCESS_GRANTED'
            }
        }, request)
    }

    /**
     * Log suspicious activity
     */
    static async logSuspiciousActivity(
        description: string,
        userId?: string,
        details: Record<string, unknown> = {},
        request?: NextRequest
    ): Promise<void> {
        await this.logSecurityEvent({
            type: 'SECURITY_VIOLATION',
            severity: 'HIGH',
            action: 'SUSPICIOUS_ACTIVITY',
            resource: 'system',
            userId,
            ipAddress: request ? this.extractIPAddress(request) : 'unknown',
            userAgent: request?.headers.get('user-agent') || 'unknown',
            details: {
                description,
                ...details
            }
        }, request)
    }

    /**
     * Get security events with filtering
     */
    static async getSecurityEvents(filters: {
        type?: SecurityEvent['type']
        severity?: SecurityEvent['severity']
        userId?: string
        startDate?: Date
        endDate?: Date
        limit?: number
        offset?: number
    } = {}) {
        const conditions = []

        if (filters.userId) {
            conditions.push(eq(auditLogSchema.userId, filters.userId))
        }

        if (filters.startDate) {
            conditions.push(gte(auditLogSchema.timestamp, filters.startDate))
        }

        if (filters.endDate) {
            conditions.push(lte(auditLogSchema.timestamp, filters.endDate))
        }

        // Filter for security events
        conditions.push(sql`${auditLogSchema.metadata}->>'securityEvent' = 'true'`)

        if (filters.type) {
            conditions.push(sql`${auditLogSchema.metadata}->>'type' = ${filters.type}`)
        }

        if (filters.severity) {
            conditions.push(sql`${auditLogSchema.metadata}->>'severity' = ${filters.severity}`)
        }

        const query = db
            .select()
            .from(auditLogSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(auditLogSchema.timestamp))
            .limit(filters.limit || 100)
            .offset(filters.offset || 0)

        return await query
    }

    /**
     * Get compliance events for reporting
     */
    static async getComplianceEvents(filters: {
        eventType?: ComplianceEvent['eventType']
        dataType?: ComplianceEvent['dataType']
        dataSubject?: string
        startDate?: Date
        endDate?: Date
        limit?: number
        offset?: number
    } = {}) {
        const conditions = []

        if (filters.startDate) {
            conditions.push(gte(auditLogSchema.timestamp, filters.startDate))
        }

        if (filters.endDate) {
            conditions.push(lte(auditLogSchema.timestamp, filters.endDate))
        }

        // Filter for compliance events
        conditions.push(sql`${auditLogSchema.metadata}->>'complianceEvent' = 'true'`)

        if (filters.eventType) {
            conditions.push(sql`${auditLogSchema.metadata}->>'eventType' = ${filters.eventType}`)
        }

        if (filters.dataType) {
            conditions.push(sql`${auditLogSchema.metadata}->>'dataType' = ${filters.dataType}`)
        }

        if (filters.dataSubject) {
            conditions.push(sql`${auditLogSchema.metadata}->>'dataSubject' = ${filters.dataSubject}`)
        }

        const query = db
            .select()
            .from(auditLogSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(auditLogSchema.timestamp))
            .limit(filters.limit || 100)
            .offset(filters.offset || 0)

        return await query
    }

    /**
     * Generate compliance report
     */
    static async generateComplianceReport(
        startDate: Date,
        endDate: Date,
        dataSubject?: string
    ) {
        const conditions = [
            gte(auditLogSchema.timestamp, startDate),
            lte(auditLogSchema.timestamp, endDate),
            sql`${auditLogSchema.metadata}->>'complianceEvent' = 'true'`
        ]

        if (dataSubject) {
            conditions.push(sql`${auditLogSchema.metadata}->>'dataSubject' = ${dataSubject}`)
        }

        // Get event counts by type
        const eventCounts = await db
            .select({
                eventType: sql`${auditLogSchema.metadata}->>'eventType'`,
                count: count()
            })
            .from(auditLogSchema)
            .where(and(...conditions))
            .groupBy(sql`${auditLogSchema.metadata}->>'eventType'`)

        // Get data access by type
        const dataAccessCounts = await db
            .select({
                dataType: sql`${auditLogSchema.metadata}->>'dataType'`,
                count: count()
            })
            .from(auditLogSchema)
            .where(and(...conditions))
            .groupBy(sql`${auditLogSchema.metadata}->>'dataType'`)

        // Get recent events
        const recentEvents = await db
            .select()
            .from(auditLogSchema)
            .where(and(...conditions))
            .orderBy(desc(auditLogSchema.timestamp))
            .limit(50)

        return {
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            },
            summary: {
                totalEvents: eventCounts.reduce((sum, item) => sum + (item.count as number), 0),
                eventBreakdown: eventCounts,
                dataAccessBreakdown: dataAccessCounts
            },
            recentEvents
        }
    }

    /**
     * Detect anomalous patterns
     */
    static async detectAnomalies(userId?: string, hours: number = 24) {
        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)
        const conditions = [gte(auditLogSchema.timestamp, startDate)]

        if (userId) {
            conditions.push(eq(auditLogSchema.userId, userId))
        }

        // Get activity patterns
        const hourlyActivity = await db
            .select({
                hour: sql`EXTRACT(HOUR FROM ${auditLogSchema.timestamp})`,
                count: count()
            })
            .from(auditLogSchema)
            .where(and(...conditions))
            .groupBy(sql`EXTRACT(HOUR FROM ${auditLogSchema.timestamp})`)

        // Get IP address patterns
        const ipActivity = await db
            .select({
                ipAddress: auditLogSchema.ipAddress,
                count: count()
            })
            .from(auditLogSchema)
            .where(and(...conditions))
            .groupBy(auditLogSchema.ipAddress)
            .orderBy(desc(count()))

        // Get failed authentication attempts
        const failedLogins = await db
            .select({
                ipAddress: auditLogSchema.ipAddress,
                count: count()
            })
            .from(auditLogSchema)
            .where(and(
                ...conditions,
                eq(auditLogSchema.action, 'LOGIN_FAILURE')
            ))
            .groupBy(auditLogSchema.ipAddress)
            .having(sql`count(*) > 5`) // More than 5 failed attempts

        return {
            hourlyActivity,
            topIPs: ipActivity.slice(0, 10),
            suspiciousIPs: failedLogins,
            anomalies: {
                unusualHours: hourlyActivity.filter(h => (h.count as number) > 100),
                multipleIPs: ipActivity.length > 5,
                failedLoginSpikes: failedLogins.length > 0
            }
        }
    }

    /**
     * Extract IP address from request
     */
    private static extractIPAddress(request: NextRequest): string {
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
     * Trigger security alert (implement based on your alerting system)
     */
    private static async triggerSecurityAlert(
        event: SecurityEvent,
        ipAddress: string,
        userAgent: string
    ): Promise<void> {
        // This would integrate with your alerting system (email, Slack, etc.)
        console.error('CRITICAL SECURITY EVENT:', {
            type: event.type,
            action: event.action,
            resource: event.resource,
            userId: event.userId,
            ipAddress,
            userAgent,
            details: event.details,
            timestamp: new Date().toISOString()
        })

        // Example: Send to monitoring service
        // await monitoringService.alert({
        //     level: 'critical',
        //     message: `Security event: ${event.action}`,
        //     metadata: event
        // })
    }
}

/**
 * Middleware to automatically log API requests
 */
export function createAuditMiddleware() {
    return async function auditMiddleware(
        request: NextRequest,
        userId?: string,
        sessionId?: string
    ): Promise<void> {
        const startTime = Date.now()
        const path = request.nextUrl.pathname
        const method = request.method

        // Log the request
        await EnhancedAuditService.logActivity({
            userId,
            sessionId,
            action: 'API_REQUEST',
            path,
            method,
            metadata: {
                query: Object.fromEntries(request.nextUrl.searchParams),
                headers: Object.fromEntries(request.headers.entries()),
                startTime
            }
        })
    }
}

/**
 * Compliance decorator for sensitive operations
 */
export function withComplianceLogging(
    eventType: ComplianceEvent['eventType'],
    dataType: ComplianceEvent['dataType'],
    purpose: string
) {
    return function decorator(
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor
    ) {
        const method = descriptor.value

        descriptor.value = async function (this: any, ...args: any[]) {
            const userId = this.userId || args[0]?.userId
            const dataSubject = args[0]?.dataSubject || args[0]?.id

            // Log before operation
            await EnhancedAuditService.logComplianceEvent({
                eventType,
                dataType,
                userId,
                dataSubject,
                purpose
            })

            try {
                const result = await method.apply(this, args)
                return result
            } catch (error) {
                // Log error
                await EnhancedAuditService.logSecurityEvent({
                    type: 'SYSTEM',
                    severity: 'HIGH',
                    action: 'OPERATION_FAILED',
                    resource: propertyName,
                    userId,
                    ipAddress: 'system',
                    userAgent: 'system',
                    details: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        operation: propertyName,
                        dataType,
                        purpose
                    }
                })
                throw error
            }
        }

        return descriptor
    }
}