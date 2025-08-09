import { z } from 'zod'

// Blood bank profile validation schema
export const bloodBankProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(200, 'Name must be less than 200 characters'),
    address: z.object({
        street: z.string().min(1, 'Street address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
        zipCode: z.string().min(5, 'ZIP code must be at least 5 characters').max(10, 'ZIP code must be less than 10 characters'),
        country: z.string().min(1, 'Country is required')
    }),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20, 'Phone number must be less than 20 characters'),
    email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
    operatingHours: z.object({
        monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
        sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional()
    }).optional(),
    capacity: z.number().min(1, 'Capacity must be at least 1').max(10000, 'Capacity must be less than 10,000'),
    coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180)
    }).optional()
})

// Blood bank registration schema (includes user creation)
export const bloodBankRegistrationSchema = z.object({
    // User account details
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    // Blood bank profile details
    bloodBank: bloodBankProfileSchema
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
})

// Blood inventory validation schema
export const bloodInventorySchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], {
        message: 'Invalid blood type'
    }),
    unitsAvailable: z.number().min(0, 'Units available cannot be negative').max(1000, 'Units available must be less than 1,000'),
    unitsReserved: z.number().min(0, 'Units reserved cannot be negative').max(1000, 'Units reserved must be less than 1,000'),
    minimumThreshold: z.number().min(0, 'Minimum threshold cannot be negative').max(100, 'Minimum threshold must be less than 100'),
    expirationDate: z.string().optional().refine((date) => {
        if (!date) return true
        const expDate = new Date(date)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
        return expDate >= today
    }, 'Expiration date must be today or in the future')
})

// Bulk inventory update schema
export const bulkInventoryUpdateSchema = z.object({
    updates: z.array(z.object({
        bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        unitsAvailable: z.number().min(0).max(1000),
        unitsReserved: z.number().min(0).max(1000).optional(),
        minimumThreshold: z.number().min(0).max(100).optional(),
        expirationDate: z.string().optional()
    })).min(1, 'At least one inventory update is required')
})

// Inventory alert threshold schema
export const inventoryAlertSchema = z.object({
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    threshold: z.number().min(0, 'Threshold cannot be negative').max(100, 'Threshold must be less than 100'),
    alertType: z.enum(['low_stock', 'critical_stock', 'expiring_soon'], {
        message: 'Invalid alert type'
    })
})

// Export types
export type BloodBankProfile = z.infer<typeof bloodBankProfileSchema>
export type BloodBankRegistration = z.infer<typeof bloodBankRegistrationSchema>
export type BloodInventory = z.infer<typeof bloodInventorySchema>
export type BulkInventoryUpdate = z.infer<typeof bulkInventoryUpdateSchema>
export type InventoryAlert = z.infer<typeof inventoryAlertSchema>