import { z } from 'zod'
import { addressSchema, emergencyContactSchema, bloodTypeSchema } from './common'

// Medical history validation schemas
export const medicalConditionSchema = z.object({
    condition: z.string().min(1, 'Medical condition is required'),
    diagnosed: z.string().optional(), // Date as string
    medications: z.array(z.string()).optional(),
    notes: z.string().optional()
})

export const medicalHistorySchema = z.object({
    hasChronicConditions: z.boolean().default(false),
    chronicConditions: z.array(medicalConditionSchema).optional(),
    currentMedications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    surgeries: z.array(z.object({
        procedure: z.string().min(1, 'Surgery procedure is required'),
        date: z.string().optional(),
        notes: z.string().optional()
    })).optional(),
    bloodTransfusions: z.array(z.object({
        date: z.string().optional(),
        reason: z.string().optional(),
        location: z.string().optional()
    })).optional(),
    pregnancies: z.object({
        hasBeenPregnant: z.boolean().default(false),
        numberOfPregnancies: z.number().min(0).optional(),
        lastPregnancyDate: z.string().optional()
    }).optional(),
    lifestyle: z.object({
        smoker: z.boolean().default(false),
        alcoholConsumption: z.enum(['none', 'occasional', 'moderate', 'heavy']).default('none'),
        recentTattoos: z.boolean().default(false),
        recentPiercings: z.boolean().default(false),
        recentTravel: z.array(z.object({
            country: z.string(),
            dateFrom: z.string(),
            dateTo: z.string()
        })).optional()
    }).optional()
})

// Donor eligibility criteria
export const eligibilitySchema = z.object({
    age: z.number().min(16, 'Must be at least 16 years old').max(100, 'Age must be realistic'),
    weight: z.number().min(110, 'Must weigh at least 110 pounds (50kg)').optional(),
    lastDonationDate: z.string().optional(),
    isEligible: z.boolean(),
    eligibilityReasons: z.array(z.string()).optional(),
    nextEligibleDate: z.string().optional(),
    temporaryDeferrals: z.array(z.object({
        reason: z.string(),
        until: z.string(),
        notes: z.string().optional()
    })).optional(),
    permanentDeferrals: z.array(z.object({
        reason: z.string(),
        notes: z.string().optional()
    })).optional()
})

// Enhanced donor profile schema with medical history
export const donorProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    dateOfBirth: z.string().refine((date) => {
        const birthDate = new Date(date)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 16 && age - 1 <= 100
        }
        return age >= 16 && age <= 100
    }, 'Must be between 16 and 100 years old'),
    bloodType: bloodTypeSchema,
    phone: z.string().min(10, 'Valid phone number is required').max(20, 'Phone number too long'),
    address: addressSchema,
    emergencyContact: emergencyContactSchema,
    medicalHistory: medicalHistorySchema.optional(),
    preferences: z.object({
        notifications: z.object({
            email: z.boolean().default(true),
            sms: z.boolean().default(false),
            push: z.boolean().default(true)
        }).optional(),
        scheduling: z.object({
            preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
            preferredTimes: z.array(z.enum(['morning', 'afternoon', 'evening'])).optional(),
            maxTravelDistance: z.number().min(1).max(100).optional() // miles
        }).optional(),
        privacy: z.object({
            shareDataForResearch: z.boolean().default(false),
            allowPublicRecognition: z.boolean().default(true)
        }).optional()
    }).optional()
})

// Multi-step registration schemas
export const registrationStep1Schema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

export const registrationStep2Schema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().refine((date) => {
        const birthDate = new Date(date)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        return age >= 16 && age <= 100
    }, 'Must be between 16 and 100 years old'),
    bloodType: bloodTypeSchema,
    phone: z.string().min(10, 'Valid phone number is required')
})

export const registrationStep3Schema = z.object({
    address: addressSchema,
    emergencyContact: emergencyContactSchema
})

export const registrationStep4Schema = z.object({
    medicalHistory: medicalHistorySchema,
    preferences: z.object({
        notifications: z.object({
            email: z.boolean().default(true),
            sms: z.boolean().default(false),
            push: z.boolean().default(true)
        }).optional(),
        scheduling: z.object({
            preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
            preferredTimes: z.array(z.enum(['morning', 'afternoon', 'evening'])).optional(),
            maxTravelDistance: z.number().min(1).max(100).optional()
        }).optional(),
        privacy: z.object({
            shareDataForResearch: z.boolean().default(false),
            allowPublicRecognition: z.boolean().default(true)
        }).optional()
    }).optional()
})

// Complete registration schema
export const completeRegistrationSchema = z.object({
    step1: registrationStep1Schema,
    step2: registrationStep2Schema,
    step3: registrationStep3Schema,
    step4: registrationStep4Schema
})

// Profile update schemas
export const updateDonorProfileSchema = donorProfileSchema.partial()

export const updateMedicalHistorySchema = medicalHistorySchema.partial()

export const updatePreferencesSchema = z.object({
    notifications: z.object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        push: z.boolean().optional()
    }).optional(),
    scheduling: z.object({
        preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
        preferredTimes: z.array(z.enum(['morning', 'afternoon', 'evening'])).optional(),
        maxTravelDistance: z.number().min(1).max(100).optional()
    }).optional(),
    privacy: z.object({
        shareDataForResearch: z.boolean().optional(),
        allowPublicRecognition: z.boolean().optional()
    }).optional()
}).partial()

// Type exports
export type MedicalCondition = z.infer<typeof medicalConditionSchema>
export type MedicalHistory = z.infer<typeof medicalHistorySchema>
export type DonorEligibility = z.infer<typeof eligibilitySchema>
export type DonorProfile = z.infer<typeof donorProfileSchema>
export type RegistrationStep1 = z.infer<typeof registrationStep1Schema>
export type RegistrationStep2 = z.infer<typeof registrationStep2Schema>
export type RegistrationStep3 = z.infer<typeof registrationStep3Schema>
export type RegistrationStep4 = z.infer<typeof registrationStep4Schema>
export type CompleteRegistration = z.infer<typeof completeRegistrationSchema>
export type UpdateDonorProfile = z.infer<typeof updateDonorProfileSchema>
export type UpdateMedicalHistory = z.infer<typeof updateMedicalHistorySchema>
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>