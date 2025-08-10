import { z } from 'zod'
import { addressSchema } from './auth'

// Healthcare facility registration schema
export const healthcareFacilityRegistrationSchema = z.object({
    name: z.string().min(1, 'Facility name is required').max(200, 'Name too long'),
    address: addressSchema,
    phone: z.string().min(10, 'Valid phone number is required').max(20, 'Phone number too long'),
    email: z.string().email('Valid email address is required').max(255, 'Email too long'),
    licenseNumber: z.string().min(1, 'License number is required').max(100, 'License number too long'),
    facilityType: z.enum(['hospital', 'clinic', 'emergency'], {
        message: 'Please select a valid facility type'
    }),
    coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
    }).optional()
})

// Healthcare facility profile update schema
export const healthcareFacilityUpdateSchema = z.object({
    name: z.string().min(1, 'Facility name is required').max(200, 'Name too long').optional(),
    address: addressSchema.optional(),
    phone: z.string().min(10, 'Valid phone number is required').max(20, 'Phone number too long').optional(),
    email: z.string().email('Valid email address is required').max(255, 'Email too long').optional(),
    licenseNumber: z.string().min(1, 'License number is required').max(100, 'License number too long').optional(),
    facilityType: z.enum(['hospital', 'clinic', 'emergency'], {
        message: 'Please select a valid facility type'
    }).optional(),
    coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
    }).optional(),
    isActive: z.boolean().optional()
})

// Type exports
export type HealthcareFacilityRegistrationInput = z.infer<typeof healthcareFacilityRegistrationSchema>
export type HealthcareFacilityUpdateInput = z.infer<typeof healthcareFacilityUpdateSchema>