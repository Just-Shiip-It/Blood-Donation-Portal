import { z } from 'zod'

// Base user validation
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
})

// Address schema for donor profiles
export const addressSchema = z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(5, 'Valid zip code is required'),
    country: z.string().optional()
})

// Emergency contact schema
export const emergencyContactSchema = z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    email: z.string().email('Valid email is required').optional()
})

// Donor profile schema
export const donorProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().refine((date) => {
        const birthDate = new Date(date)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        return age >= 16 && age <= 100
    }, 'Must be between 16 and 100 years old'),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
        message: 'Please select a valid blood type'
    }),
    phone: z.string().min(10, 'Valid phone number is required'),
    address: addressSchema,
    emergencyContact: emergencyContactSchema,
    preferences: z.record(z.string(), z.unknown()).optional()
})

// Registration schema
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    role: z.enum(['donor', 'admin', 'facility', 'system_admin'], {
        message: 'Please select a valid role'
    }),
    profile: donorProfileSchema.optional()
}).refine((data) => {
    // If role is donor, profile is required
    if (data.role === 'donor') {
        return data.profile !== undefined
    }
    return true
}, {
    message: 'Profile information is required for donor registration',
    path: ['profile']
})

// Address schema for updates (all fields optional)
export const updateAddressSchema = z.object({
    street: z.string().min(1, 'Street address is required').optional(),
    city: z.string().min(1, 'City is required').optional(),
    state: z.string().min(1, 'State is required').optional(),
    zipCode: z.string().min(5, 'Valid zip code is required').optional(),
    country: z.string().optional()
})

// Emergency contact schema for updates (all fields optional)
export const updateEmergencyContactSchema = z.object({
    name: z.string().min(1, 'Emergency contact name is required').optional(),
    relationship: z.string().min(1, 'Relationship is required').optional(),
    phone: z.string().min(10, 'Valid phone number is required').optional(),
    email: z.string().email('Valid email is required').optional()
})

// Profile update schema
export const updateProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    phone: z.string().min(10, 'Valid phone number is required').optional(),
    address: updateAddressSchema.optional(),
    emergencyContact: updateEmergencyContactSchema.optional(),
    preferences: z.record(z.string(), z.unknown()).optional()
})

// Password change schema
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

// Email verification schema
export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required')
})

// Password reset request schema
export const resetPasswordRequestSchema = z.object({
    email: z.string().email('Invalid email address')
})

// Password reset schema
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

// Type exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type DonorProfileInput = z.infer<typeof donorProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>