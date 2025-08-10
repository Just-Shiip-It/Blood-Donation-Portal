import { z } from 'zod'
import { bloodTypeSchema } from './common'

// Health metrics schema for donation records
export const healthMetricsSchema = z.object({
    bloodPressure: z.object({
        systolic: z.number().min(80).max(200),
        diastolic: z.number().min(40).max(120)
    }).optional(),
    hemoglobin: z.number().min(8).max(20).optional(), // g/dL
    pulse: z.number().min(40).max(120).optional(), // BPM
    temperature: z.number().min(95).max(105).optional(), // Fahrenheit
    weight: z.number().min(110).max(500).optional(), // pounds
    height: z.number().min(48).max(84).optional(), // inches
    notes: z.string().max(500).optional()
})

// Donation record creation schema
export const createDonationRecordSchema = z.object({
    donorId: z.string().uuid('Invalid donor ID'),
    bloodBankId: z.string().uuid('Invalid blood bank ID'),
    appointmentId: z.string().uuid('Invalid appointment ID').optional(),
    donationDate: z.string().refine((date) => {
        const donationDate = new Date(date)
        const now = new Date()
        return donationDate <= now
    }, 'Donation date cannot be in the future'),
    bloodType: bloodTypeSchema,
    unitsCollected: z.number().min(0.5).max(2).optional().default(1), // Typical donation is 1 unit
    healthMetrics: healthMetricsSchema.optional(),
    notes: z.string().max(1000).optional()
})

// Donation record update schema
export const updateDonationRecordSchema = createDonationRecordSchema.partial().omit({
    donorId: true,
    appointmentId: true
})

// Donation history query schema
export const donationHistoryQuerySchema = z.object({
    donorId: z.string().uuid().optional(),
    bloodBankId: z.string().uuid().optional(),
    bloodType: bloodTypeSchema.optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sortBy: z.enum(['donationDate', 'bloodType', 'unitsCollected', 'createdAt']).default('donationDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Donation statistics query schema
export const donationStatsQuerySchema = z.object({
    donorId: z.string().uuid().optional(),
    bloodBankId: z.string().uuid().optional(),
    period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('year'),
    startDate: z.string().optional(),
    endDate: z.string().optional()
})

// Export functionality schema
export const exportDonationHistorySchema = z.object({
    donorId: z.string().uuid().optional(),
    format: z.enum(['csv', 'pdf', 'json']).default('csv'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    includeHealthMetrics: z.boolean().default(false),
    includeNotes: z.boolean().default(false)
})

// Health insights schema
export const healthInsightsSchema = z.object({
    donorId: z.string().uuid(),
    period: z.enum(['3months', '6months', '1year', '2years', 'all']).default('1year')
})

// Type exports
export type HealthMetrics = z.infer<typeof healthMetricsSchema>
export type CreateDonationRecord = z.infer<typeof createDonationRecordSchema>
export type UpdateDonationRecord = z.infer<typeof updateDonationRecordSchema>
export type DonationHistoryQuery = z.infer<typeof donationHistoryQuerySchema>
export type DonationStatsQuery = z.infer<typeof donationStatsQuerySchema>
export type ExportDonationHistory = z.infer<typeof exportDonationHistorySchema>
export type HealthInsights = z.infer<typeof healthInsightsSchema>