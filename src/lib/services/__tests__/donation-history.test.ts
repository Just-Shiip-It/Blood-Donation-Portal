import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DonationHistoryService } from '../donation-history'
import { db } from '@/lib/db'
import { donationHistorySchema, donorProfileSchema, appointmentSchema } from '@/lib/db/schema'

// Mock the database
const mockDb = {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn()
}

vi.mock('@/lib/db', () => ({
    db: mockDb
}))

// Mock drizzle-orm functions
const mockEq = vi.fn()
const mockAnd = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockDesc = vi.fn()
const mockAsc = vi.fn()
const mockCount = vi.fn()
const mockSql = vi.fn()

vi.mock('drizzle-orm', () => ({
    eq: mockEq,
    and: mockAnd,
    gte: mockGte,
    lte: mockLte,
    desc: mockDesc,
    asc: mockAsc,
    count: mockCount,
    sql: mockSql
}))

describe('DonationHistoryService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('createDonationRecord', () => {
        it('should create a new donation record successfully', async () => {
            const mockDonationData = {
                donorId: 'donor-123',
                bloodBankId: 'bank-456',
                appointmentId: 'appt-789',
                donationDate: '2024-01-15',
                bloodType: 'O+',
                unitsCollected: 1,
                healthMetrics: {
                    hemoglobin: 13.5,
                    bloodPressure: { systolic: 120, diastolic: 80 },
                    pulse: 72
                },
                notes: 'Successful donation'
            }

            const mockCreatedRecord = {
                id: 'donation-123',
                ...mockDonationData,
                donationDate: new Date(mockDonationData.donationDate),
                createdAt: new Date()
            }

            // Mock database insert chain
            const mockReturning = vi.fn().mockResolvedValue([mockCreatedRecord])
            const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
            mockDb.insert.mockReturnValue({ values: mockValues })

            // Mock donor profile update chain
            const mockWhere = vi.fn().mockResolvedValue(undefined)
            const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
            mockDb.update.mockReturnValue({ set: mockSet })

            const result = await DonationHistoryService.createDonationRecord(mockDonationData)

            expect(mockDb.insert).toHaveBeenCalledWith(donationHistorySchema)
            expect(mockDb.update).toHaveBeenCalledWith(donorProfileSchema)
            expect(mockDb.update).toHaveBeenCalledWith(appointmentSchema)
            expect(result).toEqual(mockCreatedRecord)
        })

        it('should handle creation without appointment ID', async () => {
            const mockDonationData = {
                donorId: 'donor-123',
                bloodBankId: 'bank-456',
                donationDate: '2024-01-15',
                bloodType: 'A+',
                unitsCollected: 1
            }

            const mockCreatedRecord = {
                id: 'donation-123',
                ...mockDonationData,
                appointmentId: null,
                donationDate: new Date(mockDonationData.donationDate),
                healthMetrics: null,
                notes: null,
                createdAt: new Date()
            }

            const mockInsert = vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([mockCreatedRecord])
                })
            })
            vi.mocked(db.insert).mockReturnValue(mockInsert)

            const mockUpdate = vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(undefined)
                })
            })
            vi.mocked(db.update).mockReturnValue(mockUpdate)

            const result = await DonationHistoryService.createDonationRecord(mockDonationData)

            expect(db.insert).toHaveBeenCalledWith(donationHistorySchema)
            expect(db.update).toHaveBeenCalledWith(donorProfileSchema)
            // Should not update appointment if no appointmentId provided
            expect(db.update).toHaveBeenCalledTimes(1)
            expect(result).toEqual(mockCreatedRecord)
        })
    })

    describe('updateDonationRecord', () => {
        it('should update an existing donation record', async () => {
            const donationId = 'donation-123'
            const updateData = {
                bloodType: 'B+',
                unitsCollected: 1.5,
                notes: 'Updated notes'
            }

            const mockUpdatedRecord = {
                id: donationId,
                donorId: 'donor-123',
                bloodBankId: 'bank-456',
                ...updateData,
                donationDate: new Date('2024-01-15'),
                createdAt: new Date()
            }

            const mockUpdate = vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([mockUpdatedRecord])
                    })
                })
            })
            vi.mocked(db.update).mockReturnValue(mockUpdate)

            const result = await DonationHistoryService.updateDonationRecord(donationId, updateData)

            expect(db.update).toHaveBeenCalledWith(donationHistorySchema)
            expect(result).toEqual(mockUpdatedRecord)
        })

        it('should return null if record not found', async () => {
            const donationId = 'nonexistent-donation'
            const updateData = { notes: 'Updated notes' }

            const mockUpdate = vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        returning: vi.fn().mockResolvedValue([])
                    })
                })
            })
            vi.mocked(db.update).mockReturnValue(mockUpdate)

            const result = await DonationHistoryService.updateDonationRecord(donationId, updateData)

            expect(result).toBeNull()
        })
    })

    describe('getDonationHistory', () => {
        it('should return paginated donation history with filters', async () => {
            const query = {
                donorId: 'donor-123',
                bloodType: 'O+',
                page: 1,
                limit: 10,
                sortBy: 'donationDate',
                sortOrder: 'desc' as const
            }

            const mockDonations = [
                {
                    id: 'donation-1',
                    donorId: 'donor-123',
                    bloodBankId: 'bank-456',
                    donationDate: new Date('2024-01-15'),
                    bloodType: 'O+',
                    unitsCollected: 1,
                    createdAt: new Date(),
                    donor: { firstName: 'John', lastName: 'Doe', bloodType: 'O+' },
                    bloodBank: { name: 'City Blood Bank', address: {} }
                }
            ]

            const mockCount = [{ count: 1 }]

            // Mock count query
            const mockCountSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockCount)
                })
            })

            // Mock main query
            const mockSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                        leftJoin: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                orderBy: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        offset: vi.fn().mockResolvedValue(mockDonations)
                                    })
                                })
                            })
                        })
                    })
                })
            })

            vi.mocked(db.select)
                .mockReturnValueOnce(mockCountSelect)
                .mockReturnValueOnce(mockSelect)

            const result = await DonationHistoryService.getDonationHistory(query)

            expect(result.donations).toEqual(mockDonations)
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1
            })
        })
    })

    describe('getDonationStats', () => {
        it('should return comprehensive donation statistics', async () => {
            const query = {
                donorId: 'donor-123',
                period: 'year' as const
            }

            const mockBasicStats = [{
                totalDonations: 5,
                totalUnitsCollected: 5,
                averageUnitsPerDonation: 1.0
            }]

            const mockBloodTypeStats = [
                { bloodType: 'O+', count: 3 },
                { bloodType: 'A+', count: 2 }
            ]

            const mockMonthlyStats = [
                { month: '2024-01', count: 2, units: 2 },
                { month: '2024-02', count: 3, units: 3 }
            ]

            const mockHealthTrends = [{
                avgHemoglobin: 13.5,
                avgSystolic: 120,
                avgDiastolic: 80,
                avgPulse: 72
            }]

            const mockLastDonation = [{ donationDate: new Date('2024-02-15') }]

            const mockSelect = vi.fn()
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(mockBasicStats)
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            groupBy: vi.fn().mockResolvedValue(mockBloodTypeStats)
                        })
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            groupBy: vi.fn().mockReturnValue({
                                orderBy: vi.fn().mockResolvedValue(mockMonthlyStats)
                            })
                        })
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockResolvedValue(mockHealthTrends)
                    })
                })
                .mockReturnValueOnce({
                    from: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            orderBy: vi.fn().mockReturnValue({
                                limit: vi.fn().mockResolvedValue(mockLastDonation)
                            })
                        })
                    })
                })

            vi.mocked(db.select).mockImplementation(mockSelect)

            const result = await DonationHistoryService.getDonationStats(query)

            expect(result.totalDonations).toBe(5)
            expect(result.totalUnitsCollected).toBe(5)
            expect(result.averageUnitsPerDonation).toBe(1.0)
            expect(result.donationsByBloodType).toEqual({ 'O+': 3, 'A+': 2 })
            expect(result.donationsByMonth).toEqual([
                { month: '2024-01', count: 2, units: 2 },
                { month: '2024-02', count: 3, units: 3 }
            ])
            expect(result.healthTrends.averageHemoglobin).toBe(13.5)
            expect(result.healthTrends.averageBloodPressure).toEqual({ systolic: 120, diastolic: 80 })
            expect(result.healthTrends.averagePulse).toBe(72)
            expect(result.daysSinceLastDonation).toBeGreaterThan(0)
            expect(result.nextEligibleDate).toBeDefined()
        })
    })

    describe('getHealthInsights', () => {
        it('should return comprehensive health insights for a donor', async () => {
            const query = {
                donorId: 'donor-123',
                period: '1year' as const
            }

            const mockDonations = [
                {
                    donationDate: new Date('2024-01-15'),
                    healthMetrics: {
                        hemoglobin: 13.5,
                        bloodPressure: { systolic: 120, diastolic: 80 },
                        pulse: 72,
                        weight: 150
                    }
                },
                {
                    donationDate: new Date('2024-03-15'),
                    healthMetrics: {
                        hemoglobin: 14.0,
                        bloodPressure: { systolic: 118, diastolic: 78 },
                        pulse: 70,
                        weight: 148
                    }
                }
            ]

            const mockSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(mockDonations)
                    })
                })
            })

            vi.mocked(db.select).mockReturnValue(mockSelect)

            const result = await DonationHistoryService.getHealthInsights(query)

            expect(result.donationFrequency.totalDonations).toBe(2)
            expect(result.donationFrequency.averageDaysBetweenDonations).toBeGreaterThan(0)
            expect(result.healthMetricsTrends.hemoglobin).toHaveLength(2)
            expect(result.healthMetricsTrends.bloodPressure).toHaveLength(2)
            expect(result.healthMetricsTrends.pulse).toHaveLength(2)
            expect(result.healthMetricsTrends.weight).toHaveLength(2)
            expect(result.eligibilityStatus.daysSinceLastDonation).toBeGreaterThan(0)
            expect(result.achievements).toContain(
                expect.objectContaining({
                    type: 'milestone',
                    title: 'First Donation'
                })
            )
        })

        it('should calculate eligibility correctly', async () => {
            const query = {
                donorId: 'donor-123',
                period: '1year' as const
            }

            // Mock recent donation (less than 56 days ago)
            const recentDate = new Date()
            recentDate.setDate(recentDate.getDate() - 30) // 30 days ago

            const mockDonations = [
                {
                    donationDate: recentDate,
                    healthMetrics: { hemoglobin: 13.5 }
                }
            ]

            const mockSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockResolvedValue(mockDonations)
                    })
                })
            })

            vi.mocked(db.select).mockReturnValue(mockSelect)

            const result = await DonationHistoryService.getHealthInsights(query)

            expect(result.eligibilityStatus.isEligible).toBe(false)
            expect(result.eligibilityStatus.daysSinceLastDonation).toBe(30)
            expect(result.eligibilityStatus.reasonsForIneligibility).toContain('Must wait 56 days between donations')
            expect(result.eligibilityStatus.nextEligibleDate).toBeDefined()
        })
    })

    describe('getDonationById', () => {
        it('should return a single donation record with related data', async () => {
            const donationId = 'donation-123'
            const mockDonation = {
                id: donationId,
                donorId: 'donor-123',
                bloodBankId: 'bank-456',
                donationDate: new Date('2024-01-15'),
                bloodType: 'O+',
                unitsCollected: 1,
                createdAt: new Date(),
                donor: { firstName: 'John', lastName: 'Doe', bloodType: 'O+' },
                bloodBank: { name: 'City Blood Bank', address: {} }
            }

            const mockSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                        leftJoin: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                limit: vi.fn().mockResolvedValue([mockDonation])
                            })
                        })
                    })
                })
            })

            vi.mocked(db.select).mockReturnValue(mockSelect)

            const result = await DonationHistoryService.getDonationById(donationId)

            expect(result).toEqual(mockDonation)
        })

        it('should return null if donation not found', async () => {
            const donationId = 'nonexistent-donation'

            const mockSelect = vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    leftJoin: vi.fn().mockReturnValue({
                        leftJoin: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                limit: vi.fn().mockResolvedValue([])
                            })
                        })
                    })
                })
            })

            vi.mocked(db.select).mockReturnValue(mockSelect)

            const result = await DonationHistoryService.getDonationById(donationId)

            expect(result).toBeNull()
        })
    })

    describe('deleteDonationRecord', () => {
        it('should delete a donation record successfully', async () => {
            const donationId = 'donation-123'

            const mockDelete = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([{ id: donationId }])
                })
            })

            vi.mocked(db.delete).mockReturnValue(mockDelete)

            const result = await DonationHistoryService.deleteDonationRecord(donationId)

            expect(db.delete).toHaveBeenCalledWith(donationHistorySchema)
            expect(result).toBe(true)
        })

        it('should return false if record not found', async () => {
            const donationId = 'nonexistent-donation'

            const mockDelete = vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([])
                })
            })

            vi.mocked(db.delete).mockReturnValue(mockDelete)

            const result = await DonationHistoryService.deleteDonationRecord(donationId)

            expect(result).toBe(false)
        })
    })
})