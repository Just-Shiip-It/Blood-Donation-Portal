import { z } from 'zod'

// Blood request creation schema
export const bloodRequestSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
        message: 'Please select a valid blood type'
    }),
    unitsRequested: z.number()
        .int('Units must be a whole number')
        .min(1, 'At least 1 unit is required')
        .max(50, 'Cannot request more than 50 units at once'),
    urgencyLevel: z.enum(['routine', 'urgent', 'emergency'], {
        message: 'Please select a valid urgency level'
    }),
    patientInfo: z.object({
        age: z.number().int().min(0).max(120).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        medicalCondition: z.string().max(500, 'Medical condition description too long').optional(),
        procedureType: z.string().max(200, 'Procedure type too long').optional()
    }).optional(),
    requiredBy: z.string().refine((date) => {
        const requiredDate = new Date(date)
        const now = new Date()
        return requiredDate > now
    }, 'Required date must be in the future'),
    notes: z.string().max(1000, 'Notes too long').optional()
})

// Blood request update schema
export const bloodRequestUpdateSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
        message: 'Please select a valid blood type'
    }).optional(),
    unitsRequested: z.number()
        .int('Units must be a whole number')
        .min(1, 'At least 1 unit is required')
        .max(50, 'Cannot request more than 50 units at once')
        .optional(),
    urgencyLevel: z.enum(['routine', 'urgent', 'emergency'], {
        message: 'Please select a valid urgency level'
    }).optional(),
    patientInfo: z.object({
        age: z.number().int().min(0).max(120).optional(),
        gender: z.enum(['male', 'female', 'other']).optional(),
        medicalCondition: z.string().max(500, 'Medical condition description too long').optional(),
        procedureType: z.string().max(200, 'Procedure type too long').optional()
    }).optional(),
    requiredBy: z.string().refine((date) => {
        const requiredDate = new Date(date)
        const now = new Date()
        return requiredDate > now
    }, 'Required date must be in the future').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    status: z.enum(['pending', 'fulfilled', 'cancelled'], {
        message: 'Please select a valid status'
    }).optional()
})

// Blood request fulfillment schema
export const bloodRequestFulfillmentSchema = z.object({
    bloodBankId: z.string().uuid('Invalid blood bank ID'),
    unitsProvided: z.number()
        .int('Units must be a whole number')
        .min(1, 'At least 1 unit must be provided'),
    notes: z.string().max(1000, 'Notes too long').optional()
})

// Blood request search/filter schema
export const bloodRequestFilterSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    urgencyLevel: z.enum(['routine', 'urgent', 'emergency']).optional(),
    status: z.enum(['pending', 'fulfilled', 'cancelled']).optional(),
    facilityId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(10)
})

// Type exports
export type BloodRequestInput = z.infer<typeof bloodRequestSchema>
export type BloodRequestUpdateInput = z.infer<typeof bloodRequestUpdateSchema>
export type BloodRequestFulfillmentInput = z.infer<typeof bloodRequestFulfillmentSchema>
export type BloodRequestFilterInput = z.infer<typeof bloodRequestFilterSchema>