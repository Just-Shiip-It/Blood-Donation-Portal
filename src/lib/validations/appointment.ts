import { z } from 'zod'

// Appointment status enum
export const appointmentStatusSchema = z.enum(['scheduled', 'completed', 'cancelled', 'no_show'])

// Create appointment schema
export const createAppointmentSchema = z.object({
    bloodBankId: z.string().uuid('Invalid blood bank ID'),
    appointmentDate: z.string().datetime('Invalid appointment date'),
    notes: z.string().optional(),
})

// Update appointment schema
export const updateAppointmentSchema = z.object({
    appointmentDate: z.string().datetime('Invalid appointment date').optional(),
    status: appointmentStatusSchema.optional(),
    notes: z.string().optional(),
})

// Appointment availability query schema
export const appointmentAvailabilitySchema = z.object({
    bloodBankId: z.string().uuid('Invalid blood bank ID').optional(),
    startDate: z.string().datetime('Invalid start date'),
    endDate: z.string().datetime('Invalid end date'),
    location: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(1).max(100).default(50), // radius in miles
    }).optional(),
})

// Appointment filter schema
export const appointmentFilterSchema = z.object({
    status: appointmentStatusSchema.optional(),
    bloodBankId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
})

// Types
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type AppointmentAvailabilityQuery = z.infer<typeof appointmentAvailabilitySchema>
export type AppointmentFilterQuery = z.infer<typeof appointmentFilterSchema>