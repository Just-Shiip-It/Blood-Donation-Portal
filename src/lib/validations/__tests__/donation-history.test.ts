import { describe, it, expect } from 'vitest'
import {
    healthMetricsSchema,
    createDonationRecordSchema,
    updateDonationRecordSchema,
    donationHistoryQuerySchema,
    donationStatsQuerySchema,
    exportDonationHistorySchema,
    healthInsightsSchema
} from '../donation-history'

describe('Donation History Validation Schemas', () => {
    describe('healthMetricsSchema', () => {
        it('should validate complete health metrics', () => {
            const validHealthMetrics = {
                bloodPressure: {
                    systolic: 120,
                    diastolic: 80
                },
                hemoglobin: 13.5,
                pulse: 72,
                temperature: 98.6,
                weight: 150,
                height: 68,
                notes: 'Normal readings'
            }

            const result = healthMetricsSchema.safeParse(validHealthMetrics)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual(validHealthMetrics)
            }
        })

        it('should validate partial health metrics', () => {
            const partialHealthMetrics = {
                hemoglobin: 14.0,
                pulse: 75
            }

            const result = healthMetricsSchema.safeParse(partialHealthMetrics)
            expect(result.success).toBe(true)
        })

        it('should reject invalid blood pressure values', () => {
            const invalidHealthMetrics = {
                bloodPressure: {
                    systolic: 300, // Too high
                    diastolic: 20   // Too low
                }
            }

            const result = healthMetricsSchema.safeParse(invalidHealthMetrics)
            expect(result.success).toBe(false)
        })

        it('should reject invalid hemoglobin values', () => {
            const invalidHealthMetrics = {
                hemoglobin: 25 // Too high
            }

            const result = healthMetricsSchema.safeParse(invalidHealthMetrics)
            expect(result.success).toBe(false)
        })

        it('should reject invalid pulse values', () => {
            const invalidHealthMetrics = {
                pulse: 150 // Too high
            }

            const result = healthMetricsSchema.safeParse(invalidHealthMetrics)
            expect(result.success).toBe(false)
        })
    })

    describe('createDonationRecordSchema', () => {
        it('should validate complete donation record', () => {
            const validDonationRecord = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                appointmentId: '123e4567-e89b-12d3-a456-426614174002',
                donationDate: '2024-01-15',
                bloodType: 'O+',
                unitsCollected: 1,
                healthMetrics: {
                    hemoglobin: 13.5,
                    pulse: 72
                },
                notes: 'Successful donation'
            }

            const result = createDonationRecordSchema.safeParse(validDonationRecord)
            expect(result.success).toBe(true)
        })

        it('should validate minimal donation record', () => {
            const minimalDonationRecord = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                donationDate: '2024-01-15',
                bloodType: 'A-',
                unitsCollected: 1
            }

            const result = createDonationRecordSchema.safeParse(minimalDonationRecord)
            expect(result.success).toBe(true)
        })

        it('should reject invalid UUID format', () => {
            const invalidDonationRecord = {
                donorId: 'invalid-uuid',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                donationDate: '2024-01-15',
                bloodType: 'O+',
                unitsCollected: 1
            }

            const result = createDonationRecordSchema.safeParse(invalidDonationRecord)
            expect(result.success).toBe(false)
        })

        it('should reject future donation dates', () => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 1)

            const invalidDonationRecord = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                donationDate: futureDate.toISOString().split('T')[0],
                bloodType: 'O+',
                unitsCollected: 1
            }

            const result = createDonationRecordSchema.safeParse(invalidDonationRecord)
            expect(result.success).toBe(false)
        })

        it('should reject invalid blood types', () => {
            const invalidDonationRecord = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                donationDate: '2024-01-15',
                bloodType: 'X+', // Invalid blood type
                unitsCollected: 1
            }

            const result = createDonationRecordSchema.safeParse(invalidDonationRecord)
            expect(result.success).toBe(false)
        })

        it('should reject invalid units collected', () => {
            const invalidDonationRecord = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                donationDate: '2024-01-15',
                bloodType: 'O+',
                unitsCollected: 3 // Too many units
            }

            const result = createDonationRecordSchema.safeParse(invalidDonationRecord)
            expect(result.success).toBe(false)
        })
    })

    describe('updateDonationRecordSchema', () => {
        it('should validate partial updates', () => {
            const partialUpdate = {
                bloodType: 'B+',
                notes: 'Updated notes'
            }

            const result = updateDonationRecordSchema.safeParse(partialUpdate)
            expect(result.success).toBe(true)
        })

        it('should not allow updating donorId', () => {
            const invalidUpdate = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodType: 'B+'
            }

            const result = updateDonationRecordSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.donorId).toBeUndefined()
            }
        })
    })

    describe('donationHistoryQuerySchema', () => {
        it('should validate complete query parameters', () => {
            const validQuery = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
                bloodType: 'O+',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                page: '2',
                limit: '20',
                sortBy: 'donationDate',
                sortOrder: 'asc'
            }

            const result = donationHistoryQuerySchema.safeParse(validQuery)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.page).toBe(2)
                expect(result.data.limit).toBe(20)
            }
        })

        it('should apply default values', () => {
            const minimalQuery = {}

            const result = donationHistoryQuerySchema.safeParse(minimalQuery)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.page).toBe(1)
                expect(result.data.limit).toBe(10)
                expect(result.data.sortBy).toBe('donationDate')
                expect(result.data.sortOrder).toBe('desc')
            }
        })

        it('should enforce minimum page and limit values', () => {
            const invalidQuery = {
                page: '0',
                limit: '0'
            }

            const result = donationHistoryQuerySchema.safeParse(invalidQuery)
            expect(result.success).toBe(false)
        })

        it('should enforce maximum limit value', () => {
            const invalidQuery = {
                limit: '200' // Too high
            }

            const result = donationHistoryQuerySchema.safeParse(invalidQuery)
            expect(result.success).toBe(false)
        })
    })

    describe('donationStatsQuerySchema', () => {
        it('should validate stats query parameters', () => {
            const validQuery = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                period: 'month',
                startDate: '2024-01-01',
                endDate: '2024-01-31'
            }

            const result = donationStatsQuerySchema.safeParse(validQuery)
            expect(result.success).toBe(true)
        })

        it('should apply default period', () => {
            const minimalQuery = {}

            const result = donationStatsQuerySchema.safeParse(minimalQuery)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.period).toBe('year')
            }
        })

        it('should reject invalid period values', () => {
            const invalidQuery = {
                period: 'invalid-period'
            }

            const result = donationStatsQuerySchema.safeParse(invalidQuery)
            expect(result.success).toBe(false)
        })
    })

    describe('exportDonationHistorySchema', () => {
        it('should validate export parameters', () => {
            const validExport = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                format: 'csv',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                includeHealthMetrics: true,
                includeNotes: true
            }

            const result = exportDonationHistorySchema.safeParse(validExport)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.includeHealthMetrics).toBe(true)
                expect(result.data.includeNotes).toBe(true)
            }
        })

        it('should apply default values', () => {
            const minimalExport = {}

            const result = exportDonationHistorySchema.safeParse(minimalExport)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.format).toBe('csv')
                expect(result.data.includeHealthMetrics).toBe(false)
                expect(result.data.includeNotes).toBe(false)
            }
        })

        it('should reject invalid export formats', () => {
            const invalidExport = {
                format: 'xml' // Not supported
            }

            const result = exportDonationHistorySchema.safeParse(invalidExport)
            expect(result.success).toBe(false)
        })
    })

    describe('healthInsightsSchema', () => {
        it('should validate health insights parameters', () => {
            const validInsights = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                period: '6months'
            }

            const result = healthInsightsSchema.safeParse(validInsights)
            expect(result.success).toBe(true)
        })

        it('should require donorId', () => {
            const invalidInsights = {
                period: '1year'
            }

            const result = healthInsightsSchema.safeParse(invalidInsights)
            expect(result.success).toBe(false)
        })

        it('should apply default period', () => {
            const minimalInsights = {
                donorId: '123e4567-e89b-12d3-a456-426614174000'
            }

            const result = healthInsightsSchema.safeParse(minimalInsights)
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data.period).toBe('1year')
            }
        })

        it('should reject invalid period values', () => {
            const invalidInsights = {
                donorId: '123e4567-e89b-12d3-a456-426614174000',
                period: '5years' // Not supported
            }

            const result = healthInsightsSchema.safeParse(invalidInsights)
            expect(result.success).toBe(false)
        })
    })
})