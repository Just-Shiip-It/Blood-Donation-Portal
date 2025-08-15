import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ValidationError, AppError, ERROR_CODES, ErrorCategory, ErrorSeverity } from '@/lib/errors/types'

// Validation middleware for API routes
export function validateRequest<T extends z.ZodSchema>(schema: T) {
    return async (req: NextRequest): Promise<z.infer<T>> => {
        try {
            const body = await req.json()
            const result = schema.safeParse(body)

            if (!result.success) {
                throw ValidationError.fromZodError(result.error)
            }

            return result.data
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error
            }

            if (error instanceof SyntaxError) {
                throw new ValidationError('Invalid JSON format', [], {
                    originalError: error.message
                })
            }

            throw new AppError(
                'Request validation failed',
                ERROR_CODES.VALIDATION_FAILED,
                ErrorCategory.VALIDATION,
                ErrorSeverity.LOW,
                { originalError: error instanceof Error ? error.message : String(error) }
            )
        }
    }
}

// Query parameter validation
export function validateQuery<T extends z.ZodSchema>(schema: T) {
    return (req: NextRequest): z.infer<T> => {
        try {
            const { searchParams } = new URL(req.url)
            const queryObject: Record<string, string | string[]> = {}

            // Convert URLSearchParams to object
            for (const [key, value] of searchParams.entries()) {
                if (queryObject[key]) {
                    // Handle multiple values for the same key
                    if (Array.isArray(queryObject[key])) {
                        (queryObject[key] as string[]).push(value)
                    } else {
                        queryObject[key] = [queryObject[key] as string, value]
                    }
                } else {
                    queryObject[key] = value
                }
            }

            const result = schema.safeParse(queryObject)

            if (!result.success) {
                throw ValidationError.fromZodError(result.error)
            }

            return result.data
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error
            }

            throw new AppError(
                'Query parameter validation failed',
                ERROR_CODES.VALIDATION_FAILED,
                ErrorCategory.VALIDATION,
                ErrorSeverity.LOW,
                { originalError: error instanceof Error ? error.message : String(error) }
            )
        }
    }
}

// Path parameter validation
export function validateParams<T extends z.ZodSchema>(schema: T) {
    return (params: Record<string, string | string[]>): z.infer<T> => {
        try {
            const result = schema.safeParse(params)

            if (!result.success) {
                throw ValidationError.fromZodError(result.error)
            }

            return result.data
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error
            }

            throw new AppError(
                'Path parameter validation failed',
                ERROR_CODES.VALIDATION_FAILED,
                ErrorCategory.VALIDATION,
                ErrorSeverity.LOW,
                { originalError: error instanceof Error ? error.message : String(error) }
            )
        }
    }
}

// File upload validation
export function validateFileUpload(
    file: File,
    options: {
        maxSize?: number // in bytes
        allowedTypes?: string[]
        allowedExtensions?: string[]
        required?: boolean
    } = {}
) {
    const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
        required = false
    } = options

    if (!file && required) {
        throw new ValidationError('File is required', [{
            field: 'file',
            value: null,
            message: 'File is required',
            code: 'required'
        }])
    }

    if (!file) return true

    const errors: Array<{ field: string; value: unknown; message: string; code: string }> = []

    // Check file size
    if (file.size > maxSize) {
        errors.push({
            field: 'file.size',
            value: file.size,
            message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
            code: 'file_too_large'
        })
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        errors.push({
            field: 'file.type',
            value: file.type,
            message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            code: 'invalid_file_type'
        })
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(fileExtension)) {
        errors.push({
            field: 'file.extension',
            value: fileExtension,
            message: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
            code: 'invalid_file_extension'
        })
    }

    // Check file name
    if (file.name.length > 255) {
        errors.push({
            field: 'file.name',
            value: file.name,
            message: 'File name must be less than 255 characters',
            code: 'filename_too_long'
        })
    }

    if (!/^[a-zA-Z0-9\s\-\._]+$/.test(file.name)) {
        errors.push({
            field: 'file.name',
            value: file.name,
            message: 'File name contains invalid characters',
            code: 'invalid_filename'
        })
    }

    if (errors.length > 0) {
        throw new ValidationError('File validation failed', errors)
    }

    return true
}

// Sanitization functions
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
}

export function sanitizeEmail(email: string): string {
    return email.toLowerCase().trim()
}

export function sanitizePhone(phone: string): string {
    return phone.replace(/[^\d\+\-\(\)\s\.]/g, '').trim()
}

// Validation schemas for common use cases
export const paginationValidationSchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
}).refine(data => {
    return data.page >= 1 && data.limit >= 1 && data.limit <= 100
}, {
    message: 'Page must be >= 1 and limit must be between 1 and 100'
})

export const idValidationSchema = z.object({
    id: z.string().uuid('Invalid ID format')
})

export const searchValidationSchema = z.object({
    q: z.string().min(1, 'Search query is required').max(200, 'Search query too long'),
    filters: z.string().optional(),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10)
})

// Validation helper functions
export function validateUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return phoneRegex.test(phone)
}

export function validateBloodType(bloodType: string): boolean {
    const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    return validTypes.includes(bloodType)
}

export function validateDateRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return start <= end
}

// Batch validation for multiple items
export function validateBatch<T extends z.ZodSchema>(
    schema: T,
    items: unknown[]
): { valid: z.infer<T>[]; invalid: Array<{ index: number; errors: z.ZodError }> } {
    const valid: z.infer<T>[] = []
    const invalid: Array<{ index: number; errors: z.ZodError }> = []

    items.forEach((item, index) => {
        const result = schema.safeParse(item)
        if (result.success) {
            valid.push(result.data)
        } else {
            invalid.push({ index, errors: result.error })
        }
    })

    return { valid, invalid }
}

// Conditional validation based on user role
export function createRoleBasedValidator<T extends z.ZodSchema>(
    baseSchema: T,
    roleValidations: Record<string, z.ZodSchema>
) {
    return (data: unknown, userRole: string): z.infer<T> => {
        // First validate against base schema
        const baseResult = baseSchema.safeParse(data)
        if (!baseResult.success) {
            throw ValidationError.fromZodError(baseResult.error)
        }

        // Then validate against role-specific schema if exists
        const roleSchema = roleValidations[userRole]
        if (roleSchema) {
            const roleResult = roleSchema.safeParse(data)
            if (!roleResult.success) {
                throw ValidationError.fromZodError(roleResult.error)
            }
        }

        return baseResult.data
    }
}