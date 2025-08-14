import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { AnalyticsService } from '../analytics'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(),
    }
}))

// Mock the schema imports
vi.mock('@/lib/db/schema', () => ({
    userSchema: {
        id: 'id',
        isActive: 'isActive',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        role: 'role'
    },
    donorProfileSchema: {
        createdAt: 'createdAt'
    },
    bloodBankSchema: {
        isActive: 'isActive'
    },
    healthcareFacilitySchema: {
        isActive: 'isActive'
    },
    appointmentSchema: {
        bloodBankId: 'bloodBankId',
        appointmentDate: 'appointmentDate',
        createdAt: 'createdAt',
        status: 'status'
    },
    donationHistorySchema: {
        bloodBankId: 'bloodBankId',
        donationDate: 'donationDate'
    },
    bloodRequestSchema: {
        requestDate: 'requestDate',
        status: 'status',
        urgencyLevel: 'urgencyLevel'
    },
    bloodInventorySchema: {
        bloodBankId: 'bloodBankId',
        bloodType: 'bloodType',
        unitsAvailable: 'unitsAvailable',
        unitsReserved: 'unitsReserved',
        minimumThreshold: 'minimumThreshold'
    }
}))

describe('AnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getDashboardMetrics', () => {
        it('should return dashboard metrics with correct structure', async () => {
            // Mock Promise.all to return the expected results
            const mockPromiseAll = vi.spyOn(Promise, 'all').mockResolvedValue([
                [{ count: 100 }], // totalUsers
                [{ count: 80 }],  // totalDonors
                [{ count: 5 }],   // totalBloodBanks
                [{ count: 3 }],   // totalFacilities
                [{ count: 200 }], // totalAppointments
                [{ count: 150 }], // totalDonations
                [{ count: 25 }],  // totalBloodRequests
                [{ count: 75 }],  // activeUsers
                [{ count: 10 }],  // recentUsers
                [{ count: 8 }],   // recentDonors
                [{ count: 20 }],  // recentAppointments
                [{ count: 15 }],  // recentDonations
            ])

            const result = await AnalyticsService.getDashboardMetrics()

            expect(result).toEqual({
                totalUsers: 100,
                totalDonors: 80,
                totalBloodBanks: 5,
                totalFacilities: 3,
                totalAppointments: 200,
                totalDonations: 150,
                totalBloodRequests: 25,
                activeUsers: 75,
                recentGrowth: {
                    users: 10,
                    donors: 8,
                    appointments: 20,
                    donations: 15
                }
            })

            mockPromiseAll.mockRestore()
        })

        it('should handle empty results gracefully', async () => {
            const mockPromiseAll = vi.spyOn(Promise, 'all').mockResolvedValue(
                Array(12).fill([])
            )

            const result = await AnalyticsService.getDashboardMetrics()

            expect(result.totalUsers).toBe(0)
            expect(result.totalDonors).toBe(0)
            expect(result.recentGrowth.users).toBe(0)

            mockPromiseAll.mockRestore()
        })
    })

    describe('getBloodBankMetrics', () => {
        it('should return blood bank specific metrics', async () => {
            const bloodBankId = 'test-blood-bank-id'

            const mockPromiseAll = vi.spyOn(Promise, 'all').mockResolvedValue([
                [
                    { bloodType: 'A+', available: 10, reserved: 2, threshold: 5 },
                    { bloodType: 'O-', available: 3, reserved: 1, threshold: 8 }
                ], // inventory data
                [{ count: 5 }],  // appointments today
                [{ count: 15 }], // appointments this week
                [{ count: 25 }], // donations this month
            ])

            const result = await AnalyticsService.getBloodBankMetrics(bloodBankId)

            expect(result).toEqual({
                bloodBankId,
                totalInventory: 13, // 10 + 3
                lowStockAlerts: 1,  // O- is below threshold
                appointmentsToday: 5,
                appointmentsThisWeek: 15,
                donationsThisMonth: 25,
                inventoryByType: [
                    { bloodType: 'A+', available: 10, reserved: 2, threshold: 5 },
                    { bloodType: 'O-', available: 3, reserved: 1, threshold: 8 }
                ]
            })

            mockPromiseAll.mockRestore()
        })
    })

    describe('getUserManagementData', () => {
        it('should return filtered user data', async () => {
            const mockUsers = [
                {
                    id: '1',
                    email: 'test@example.com',
                    role: 'donor',
                    isActive: true,
                    emailVerified: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]

            const mockTotalCount = [{ count: 1 }]

            // Mock the database queries
            const { db } = await import('@/lib/db')
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockResolvedValue(mockUsers)
            }

            const mockCountQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue(mockTotalCount)
            }

                ; (db.select as Mock)
                    .mockReturnValueOnce(mockQuery)
                    .mockReturnValueOnce(mockCountQuery)

            const result = await AnalyticsService.getUserManagementData({
                role: 'donor',
                isActive: true,
                limit: 10,
                offset: 0
            })

            expect(result).toEqual({
                users: mockUsers,
                total: 1
            })
        })
    })

    describe('getReportingData', () => {
        it('should return donations report data', async () => {
            const mockDonations = [
                {
                    id: '1',
                    donorId: 'donor-1',
                    bloodBankId: 'bank-1',
                    donationDate: new Date(),
                    bloodType: 'A+',
                    volume: 450
                }
            ]

            const { db } = await import('@/lib/db')
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockDonations)
            }

                ; (db.select as Mock).mockReturnValue(mockQuery)

            const result = await AnalyticsService.getReportingData('donations', {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                bloodBankId: 'bank-1'
            })

            expect(result).toEqual(mockDonations)
        })

        it('should throw error for unsupported report type', async () => {
            await expect(
                AnalyticsService.getReportingData('invalid' as never, {})
            ).rejects.toThrow('Unsupported report type: invalid')
        })
    })
})