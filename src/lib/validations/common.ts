import { z } from 'zod'

// Blood type validation
export const bloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])

// Phone number validation (basic)
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Invalid phone number format')

// Email validation
export const emailSchema = z.string().email('Invalid email format')

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Date validation
export const dateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format')

// Address schema
export const addressSchema = z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
})

// Emergency contact schema
export const emergencyContactSchema = z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: phoneSchema,
})

// Common validation functions
export function validateBloodType(bloodType: string): boolean {
    return bloodTypeSchema.safeParse(bloodType).success
}

export function validateEmail(email: string): boolean {
    return emailSchema.safeParse(email).success
}

export function validatePhone(phone: string): boolean {
    return phoneSchema.safeParse(phone).success
}