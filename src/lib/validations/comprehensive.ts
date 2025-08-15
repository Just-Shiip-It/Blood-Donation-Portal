import { z } from 'zod'

// Enhanced common validation schemas with better error messages
export const enhancedBloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
    message: 'Please select a valid blood type'
})

export const enhancedPhoneSchema = z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Phone number format is invalid. Use digits, spaces, dashes, or parentheses only')

export const enhancedEmailSchema = z.string()
    .min(1, 'Email address is required')
    .max(255, 'Email address must be less than 255 characters')
    .email('Please enter a valid email address')

export const enhancedUuidSchema = z.string()
    .uuid('Invalid ID format. Must be a valid UUID')

export const enhancedDateSchema = z.string()
    .min(1, 'Date is required')
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format. Please use a valid date')

// Enhanced address schema with better validation
export const enhancedAddressSchema = z.object({
    street: z.string()
        .min(1, 'Street address is required')
        .max(200, 'Street address must be less than 200 characters')
        .regex(/^[a-zA-Z0-9\s\-\.,#]+$/, 'Street address contains invalid characters'),
    city: z.string()
        .min(1, 'City is required')
        .max(100, 'City name must be less than 100 characters')
        .regex(/^[a-zA-Z\s\-\.]+$/, 'City name can only contain letters, spaces, hyphens, and periods'),
    state: z.string()
        .min(2, 'State is required')
        .max(50, 'State name must be less than 50 characters')
        .regex(/^[a-zA-Z\s\-\.]+$/, 'State name can only contain letters, spaces, hyphens, and periods'),
    zipCode: z.string()
        .min(5, 'ZIP code must be at least 5 characters')
        .max(10, 'ZIP code must be less than 10 characters')
        .regex(/^[\d\-\s]+$/, 'ZIP code can only contain digits, hyphens, and spaces'),
    country: z.string()
        .min(1, 'Country is required')
        .max(100, 'Country name must be less than 100 characters')
        .regex(/^[a-zA-Z\s\-\.]+$/, 'Country name can only contain letters, spaces, hyphens, and periods')
})

// Enhanced emergency contact schema
export const enhancedEmergencyContactSchema = z.object({
    name: z.string()
        .min(1, 'Emergency contact name is required')
        .max(100, 'Name must be less than 100 characters')
        .regex(/^[a-zA-Z\s\-\.]+$/, 'Name can only contain letters, spaces, hyphens, and periods'),
    relationship: z.string()
        .min(1, 'Relationship is required')
        .max(50, 'Relationship must be less than 50 characters')
        .regex(/^[a-zA-Z\s\-]+$/, 'Relationship can only contain letters, spaces, and hyphens'),
    phone: enhancedPhoneSchema,
    email: enhancedEmailSchema.optional()
})

// Comprehensive user profile validation
export const userProfileSchema = z.object({
    id: enhancedUuidSchema.optional(),
    email: enhancedEmailSchema,
    role: z.enum(['donor', 'admin', 'facility', 'system_admin'], {
        message: 'Invalid user role. Must be donor, admin, facility, or system_admin'
    }),
    isActive: z.boolean().default(true),
    emailVerified: z.boolean().default(false),
    createdAt: enhancedDateSchema.optional(),
    updatedAt: enhancedDateSchema.optional()
})

// Comprehensive donation record validation
export const donationRecordSchema = z.object({
    id: enhancedUuidSchema.optional(),
    donorId: enhancedUuidSchema,
    bloodBankId: enhancedUuidSchema,
    appointmentId: enhancedUuidSchema.optional(),
    donationDate: enhancedDateSchema,
    bloodType: enhancedBloodTypeSchema,
    unitsCollected: z.number()
        .min(0.1, 'Units collected must be greater than 0')
        .max(2, 'Units collected cannot exceed 2 units per donation')
        .multipleOf(0.1, 'Units must be in increments of 0.1'),
    hemoglobinLevel: z.number()
        .min(8, 'Hemoglobin level too low for donation')
        .max(20, 'Hemoglobin level unrealistic')
        .optional(),
    bloodPressure: z.object({
        systolic: z.number().min(90).max(200),
        diastolic: z.number().min(50).max(120)
    }).optional(),
    temperature: z.number()
        .min(96, 'Temperature too low')
        .max(100.4, 'Temperature too high for donation')
        .optional(),
    weight: z.number()
        .min(110, 'Weight must be at least 110 pounds')
        .max(500, 'Weight unrealistic')
        .optional(),
    notes: z.string()
        .max(1000, 'Notes must be less than 1000 characters')
        .optional(),
    status: z.enum(['completed', 'deferred', 'incomplete'], {
        message: 'Invalid donation status'
    }).default('completed')
})

// Healthcare facility validation
export const healthcareFacilitySchema = z.object({
    id: enhancedUuidSchema.optional(),
    name: z.string()
        .min(2, 'Facility name must be at least 2 characters')
        .max(200, 'Facility name must be less than 200 characters'),
    type: z.enum(['hospital', 'clinic', 'emergency_center', 'surgery_center', 'other'], {
        message: 'Invalid facility type'
    }),
    address: enhancedAddressSchema,
    phone: enhancedPhoneSchema,
    email: enhancedEmailSchema,
    licenseNumber: z.string()
        .min(1, 'License number is required')
        .max(50, 'License number must be less than 50 characters'),
    emergencyContact: enhancedEmergencyContactSchema.optional(),
    operatingHours: z.record(z.string(), z.object({
        open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
        close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
        closed: z.boolean().default(false)
    })).optional(),
    isActive: z.boolean().default(true)
})

// Notification preferences validation
export const notificationPreferencesSchema = z.object({
    email: z.object({
        enabled: z.boolean().default(true),
        appointments: z.boolean().default(true),
        reminders: z.boolean().default(true),
        emergencyRequests: z.boolean().default(true),
        newsletters: z.boolean().default(false),
        promotions: z.boolean().default(false)
    }),
    sms: z.object({
        enabled: z.boolean().default(false),
        appointments: z.boolean().default(false),
        reminders: z.boolean().default(false),
        emergencyRequests: z.boolean().default(true)
    }),
    push: z.object({
        enabled: z.boolean().default(true),
        appointments: z.boolean().default(true),
        reminders: z.boolean().default(true),
        emergencyRequests: z.boolean().default(true),
        news: z.boolean().default(false)
    })
})

// Search and filter validation schemas
export const searchQuerySchema = z.object({
    query: z.string()
        .min(1, 'Search query is required')
        .max(200, 'Search query must be less than 200 characters')
        .regex(/^[a-zA-Z0-9\s\-\.,]+$/, 'Search query contains invalid characters'),
    filters: z.object({
        bloodType: enhancedBloodTypeSchema.optional(),
        location: z.object({
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            radius: z.number().min(1).max(100).default(25)
        }).optional(),
        dateRange: z.object({
            start: enhancedDateSchema,
            end: enhancedDateSchema
        }).optional(),
        urgency: z.enum(['routine', 'urgent', 'emergency']).optional()
    }).optional(),
    pagination: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10)
    }).optional(),
    sorting: z.object({
        field: z.string().min(1, 'Sort field is required'),
        direction: z.enum(['asc', 'desc']).default('asc')
    }).optional()
})

// Audit log validation
export const auditLogSchema = z.object({
    id: enhancedUuidSchema.optional(),
    userId: enhancedUuidSchema,
    action: z.string()
        .min(1, 'Action is required')
        .max(100, 'Action must be less than 100 characters'),
    resource: z.string()
        .min(1, 'Resource is required')
        .max(100, 'Resource must be less than 100 characters'),
    resourceId: enhancedUuidSchema.optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    ipAddress: z.string()
        .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address format')
        .optional(),
    userAgent: z.string()
        .max(500, 'User agent must be less than 500 characters')
        .optional(),
    timestamp: enhancedDateSchema.optional()
})

// File upload validation
export const fileUploadSchema = z.object({
    file: z.object({
        name: z.string()
            .min(1, 'File name is required')
            .max(255, 'File name must be less than 255 characters')
            .regex(/^[a-zA-Z0-9\s\-\._]+$/, 'File name contains invalid characters'),
        size: z.number()
            .min(1, 'File cannot be empty')
            .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'), // 10MB limit
        type: z.string()
            .regex(/^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf|text\/(plain|csv))$/,
                'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, TXT, CSV')
    }),
    purpose: z.enum(['profile_photo', 'medical_document', 'identification', 'report'], {
        message: 'Invalid file purpose'
    })
})

// API pagination validation
export const paginationSchema = z.object({
    page: z.number()
        .int('Page must be a whole number')
        .min(1, 'Page must be at least 1')
        .default(1),
    limit: z.number()
        .int('Limit must be a whole number')
        .min(1, 'Limit must be at least 1')
        .max(100, 'Limit cannot exceed 100')
        .default(10),
    sortBy: z.string()
        .min(1, 'Sort field is required')
        .max(50, 'Sort field name too long')
        .optional(),
    sortOrder: z.enum(['asc', 'desc'])
        .default('asc')
        .optional()
})

// Type exports
export type EnhancedBloodType = z.infer<typeof enhancedBloodTypeSchema>
export type EnhancedAddress = z.infer<typeof enhancedAddressSchema>
export type EnhancedEmergencyContact = z.infer<typeof enhancedEmergencyContactSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type DonationRecord = z.infer<typeof donationRecordSchema>
export type HealthcareFacility = z.infer<typeof healthcareFacilitySchema>
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type AuditLog = z.infer<typeof auditLogSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type Pagination = z.infer<typeof paginationSchema>