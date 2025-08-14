import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { AuditService } from '../audit'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(),
        select: vi.fn(),
    }
}))

// Mock the schema imports
vi.mock('@/lib/db/schema', () => ({
    auditLogSchema: {
        userId: 'userId',
        action: 'action',
        resource: 'resource',
        resourceId: 'resourceId',
        timestamp: 'timestamp'
    },
    activityLogSchema: {
        userId: 'userId',
        action: 'action',
        path: 'path',
        timestamp: 'timestamp'
    }
}))

describe('AuditService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('logAudit', () => {
        it('should successfully log an audit entry', async () => {
            const auditEntry = {
                userId: 'user-123',
                action: 'CREATE',
                resource: 'users',
                resourceId: 'resource-456',
                oldValues: { name: 'old' },
                newValues: { name: 'new' },
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                metadata: { source: 'admin_panel' }
            }

            const { db } = await import('@/lib/db')
            const mockInsert = {
                values: vi.fn().mockResolvedValue(undefined)
            }
                ; (db.insert as Mock).mockReturnValue(mockInsert)

            await AuditService.logAudit(auditEntry)

            expect(db.insert).toHaveBeenCalled()
            expect(mockInsert.values).toHaveBeenCalledWith({
                userId: auditEntry.userId,
                action: auditEntry.action,
                resource: auditEntry.resource,
                resourceId: auditEntry.resourceId,
                oldValues: auditEntry.oldValues,
                newValues: auditEntry.newValues,
                ipAddress: auditEntry.ipAddress,
                userAgent: auditEntry.userAgent,
                metadata: auditEntry.metadata,
            })
        })

        it('should handle database errors gracefully', async () => {
            const auditEntry = {
                userId: 'user-123',
                action: 'CREATE',
                resource: 'users'
            }

            const { db } = await import('@/lib/db')
            const mockInsert = {
                values: vi.fn().mockRejectedValue(new Error('Database error'))
            }
                ; (db.insert as Mock).mockReturnValue(mockInsert)

            // Should not throw error
            await expect(AuditService.logAudit(auditEntry)).resolves.toBeUndefined()
        })
    })

    describe('logActivity', () => {
        it('should successfully log an activity entry', async () => {
            const activityEntry = {
                userId: 'user-123',
                sessionId: 'session-456',
                action: 'page_view',
                path: '/dashboard',
                method: 'GET',
                duration: '150',
                statusCode: '200',
                metadata: { referrer: 'https://example.com' }
            }

            const { db } = await import('@/lib/db')
            const mockInsert = {
                values: vi.fn().mockResolvedValue(undefined)
            }
                ; (db.insert as Mock).mockReturnValue(mockInsert)

            await AuditService.logActivity(activityEntry)

            expect(db.insert).toHaveBeenCalled()
            expect(mockInsert.values).toHaveBeenCalledWith({
                userId: activityEntry.userId,
                sessionId: activityEntry.sessionId,
                action: activityEntry.action,
                path: activityEntry.path,
                method: activityEntry.method,
                duration: activityEntry.duration,
                statusCode: activityEntry.statusCode,
                metadata: activityEntry.metadata,
            })
        })

        it('should handle database errors gracefully', async () => {
            const activityEntry = {
                action: 'api_call',
                path: '/api/test'
            }

            const { db } = await import('@/lib/db')
            const mockInsert = {
                values: vi.fn().mockRejectedValue(new Error('Database error'))
            }
                ; (db.insert as Mock).mockReturnValue(mockInsert)

            // Should not throw error
            await expect(AuditService.logActivity(activityEntry)).resolves.toBeUndefined()
        })
    })

    describe('getAuditLogs', () => {
        it('should return audit logs with default filters', async () => {
            const mockLogs = [
                {
                    id: '1',
                    userId: 'user-123',
                    action: 'CREATE',
                    resource: 'users',
                    timestamp: new Date()
                }
            ]

            const { db } = await import('@/lib/db')
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockResolvedValue(mockLogs)
            }

                ; (db.select as Mock).mockReturnValue(mockQuery)

            const result = await AuditService.getAuditLogs()

            expect(result).toEqual(mockLogs)
            expect(mockQuery.limit).toHaveBeenCalledWith(100)
            expect(mockQuery.offset).toHaveBeenCalledWith(0)
        })

        it('should apply filters correctly', async () => {
            const filters = {
                userId: 'user-123',
                action: 'CREATE',
                resource: 'users',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                limit: 50,
                offset: 10
            }

            const { db } = await import('@/lib/db')
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockResolvedValue([])
            }

                ; (db.select as Mock).mockReturnValue(mockQuery)

            await AuditService.getAuditLogs(filters)

            expect(mockQuery.limit).toHaveBeenCalledWith(50)
            expect(mockQuery.offset).toHaveBeenCalledWith(10)
        })
    })

    describe('getAuditStats', () => {
        it('should return audit statistics', async () => {
            const mockActionStats = [
                { action: 'CREATE', count: 10 },
                { action: 'UPDATE', count: 5 }
            ]

            const mockResourceStats = [
                { resource: 'users', count: 8 },
                { resource: 'appointments', count: 7 }
            ]

            const mockTotalCount = [{ count: 15 }]

            const { db } = await import('@/lib/db')

            // Mock the three separate queries
            const mockActionQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockResolvedValue(mockActionStats)
            }

            const mockResourceQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockResolvedValue(mockResourceStats)
            }

            const mockCountQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue(mockTotalCount)
            }

                ; (db.select as Mock)
                    .mockReturnValueOnce(mockActionQuery)
                    .mockReturnValueOnce(mockResourceQuery)
                    .mockReturnValueOnce(mockCountQuery)

            const result = await AuditService.getAuditStats()

            expect(result).toEqual({
                totalEvents: 15,
                actionBreakdown: mockActionStats,
                resourceBreakdown: mockResourceStats
            })
        })

        it('should handle empty results', async () => {
            const { db } = await import('@/lib/db')

            const mockEmptyQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockResolvedValue([])
            }

            const mockEmptyCountQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue([])
            }

                ; (db.select as Mock)
                    .mockReturnValueOnce(mockEmptyQuery)
                    .mockReturnValueOnce(mockEmptyQuery)
                    .mockReturnValueOnce(mockEmptyCountQuery)

            const result = await AuditService.getAuditStats()

            expect(result.totalEvents).toBe(0)
            expect(result.actionBreakdown).toEqual([])
            expect(result.resourceBreakdown).toEqual([])
        })
    })

    describe('getUserActivitySummary', () => {
        it('should return user activity summary', async () => {
            const userId = 'user-123'
            const days = 30

            const mockAuditCount = [{ count: 25 }]
            const mockActivityCount = [{ count: 100 }]
            const mockRecentActions = [
                {
                    action: 'CREATE',
                    resource: 'users',
                    timestamp: new Date()
                }
            ]

            const { db } = await import('@/lib/db')

            const mockAuditQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue(mockAuditCount)
            }

            const mockActivityQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue(mockActivityCount)
            }

            const mockRecentQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(mockRecentActions)
            }

                ; (db.select as Mock)
                    .mockReturnValueOnce(mockAuditQuery)
                    .mockReturnValueOnce(mockActivityQuery)
                    .mockReturnValueOnce(mockRecentQuery)

            const result = await AuditService.getUserActivitySummary(userId, days)

            expect(result).toEqual({
                auditEvents: 25,
                activityEvents: 100,
                recentActions: mockRecentActions
            })
        })
    })
})