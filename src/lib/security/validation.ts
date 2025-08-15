import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sanitizeText, sanitizeSqlInput } from './sanitization'
import { EnhancedAuditService } from './audit-enhanced'

/**
 * SQL injection patterns to detect and block
 */
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\))/gi,
    /(\b(CAST|CONVERT)\s*\()/gi,
    /(\b(WAITFOR|DELAY)\b)/gi,
    /(\b(XP_|SP_)\w+)/gi,
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)/gi
]

/**
 * XSS patterns to detect and block
 */
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
]

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
]

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
    /[;&|`$(){}[\]]/g,
    /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh|ftp)\b/gi
]

export interface ValidationResult {
    isValid: boolean
    errors: string[]
    sanitizedData?: any
    threats: string[]
}

export interface SecurityValidationOptions {
    checkSqlInjection: boolean
    checkXss: boolean
    checkPathTraversal: boolean
    checkCommandInjection: boolean
    sanitizeInput: boolean
    maxLength?: number
    allowedFields?: string[]
    requiredFields?: string[]
}

/**
 * Default security validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: SecurityValidationOptions = {
    checkSqlInjection: true,
    checkXss: true,
    checkPathTraversal: true,
    checkCommandInjection: true,
    sanitizeInput: true,
    maxLength: 10000
}

/**
 * Security validator class
 */
export class SecurityValidator {
    private options: SecurityValidationOptions

    constructor(options: SecurityValidationOptions = DEFAULT_VALIDATION_OPTIONS) {
        this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options }
    }

    /**
     * Validate input data for security threats
     */
    validateInput(data: any, fieldName: string = 'input'): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            threats: [],
            sanitizedData: data
        }

        if (typeof data === 'string') {
            return this.validateString(data, fieldName)
        }

        if (typeof data === 'object' && data !== null) {
            return this.validateObject(data)
        }

        return result
    }

    /**
     * Validate string input
     */
    private validateString(input: string, fieldName: string): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            threats: [],
            sanitizedData: input
        }

        // Check length
        if (this.options.maxLength && input.length > this.options.maxLength) {
            result.isValid = false
            result.errors.push(`${fieldName} exceeds maximum length of ${this.options.maxLength}`)
        }

        // Check for SQL injection
        if (this.options.checkSqlInjection) {
            const sqlThreats = this.detectSqlInjection(input)
            if (sqlThreats.length > 0) {
                result.isValid = false
                result.threats.push(...sqlThreats)
                result.errors.push(`${fieldName} contains potential SQL injection patterns`)
            }
        }

        // Check for XSS
        if (this.options.checkXss) {
            const xssThreats = this.detectXss(input)
            if (xssThreats.length > 0) {
                result.isValid = false
                result.threats.push(...xssThreats)
                result.errors.push(`${fieldName} contains potential XSS patterns`)
            }
        }

        // Check for path traversal
        if (this.options.checkPathTraversal) {
            const pathThreats = this.detectPathTraversal(input)
            if (pathThreats.length > 0) {
                result.isValid = false
                result.threats.push(...pathThreats)
                result.errors.push(`${fieldName} contains potential path traversal patterns`)
            }
        }

        // Check for command injection
        if (this.options.checkCommandInjection) {
            const cmdThreats = this.detectCommandInjection(input)
            if (cmdThreats.length > 0) {
                result.isValid = false
                result.threats.push(...cmdThreats)
                result.errors.push(`${fieldName} contains potential command injection patterns`)
            }
        }

        // Sanitize if requested
        if (this.options.sanitizeInput) {
            result.sanitizedData = this.sanitizeString(input)
        }

        return result
    }

    /**
     * Validate object input
     */
    private validateObject(obj: Record<string, any>): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            threats: [],
            sanitizedData: {}
        }

        // Check allowed fields
        if (this.options.allowedFields) {
            const invalidFields = Object.keys(obj).filter(
                key => !this.options.allowedFields!.includes(key)
            )
            if (invalidFields.length > 0) {
                result.isValid = false
                result.errors.push(`Invalid fields: ${invalidFields.join(', ')}`)
            }
        }

        // Check required fields
        if (this.options.requiredFields) {
            const missingFields = this.options.requiredFields.filter(
                field => !(field in obj)
            )
            if (missingFields.length > 0) {
                result.isValid = false
                result.errors.push(`Missing required fields: ${missingFields.join(', ')}`)
            }
        }

        // Validate each field
        for (const [key, value] of Object.entries(obj)) {
            const fieldResult = this.validateInput(value, key)

            if (!fieldResult.isValid) {
                result.isValid = false
                result.errors.push(...fieldResult.errors)
                result.threats.push(...fieldResult.threats)
            }

            result.sanitizedData[key] = fieldResult.sanitizedData
        }

        return result
    }

    /**
     * Detect SQL injection patterns
     */
    private detectSqlInjection(input: string): string[] {
        const threats: string[] = []

        for (const pattern of SQL_INJECTION_PATTERNS) {
            const matches = input.match(pattern)
            if (matches) {
                threats.push(`SQL injection pattern: ${matches.join(', ')}`)
            }
        }

        return threats
    }

    /**
     * Detect XSS patterns
     */
    private detectXss(input: string): string[] {
        const threats: string[] = []

        for (const pattern of XSS_PATTERNS) {
            const matches = input.match(pattern)
            if (matches) {
                threats.push(`XSS pattern: ${matches.join(', ')}`)
            }
        }

        return threats
    }

    /**
     * Detect path traversal patterns
     */
    private detectPathTraversal(input: string): string[] {
        const threats: string[] = []

        for (const pattern of PATH_TRAVERSAL_PATTERNS) {
            const matches = input.match(pattern)
            if (matches) {
                threats.push(`Path traversal pattern: ${matches.join(', ')}`)
            }
        }

        return threats
    }

    /**
     * Detect command injection patterns
     */
    private detectCommandInjection(input: string): string[] {
        const threats: string[] = []

        for (const pattern of COMMAND_INJECTION_PATTERNS) {
            const matches = input.match(pattern)
            if (matches) {
                threats.push(`Command injection pattern: ${matches.join(', ')}`)
            }
        }

        return threats
    }

    /**
     * Sanitize string input
     */
    private sanitizeString(input: string): string {
        let sanitized = input

        // Remove SQL injection patterns
        if (this.options.checkSqlInjection) {
            sanitized = sanitizeSqlInput(sanitized)
        }

        // Sanitize for XSS
        if (this.options.checkXss) {
            sanitized = sanitizeText(sanitized)
        }

        // Remove path traversal patterns
        if (this.options.checkPathTraversal) {
            for (const pattern of PATH_TRAVERSAL_PATTERNS) {
                sanitized = sanitized.replace(pattern, '')
            }
        }

        // Remove command injection patterns
        if (this.options.checkCommandInjection) {
            for (const pattern of COMMAND_INJECTION_PATTERNS) {
                sanitized = sanitized.replace(pattern, '')
            }
        }

        return sanitized.trim()
    }
}

/**
 * Create validation middleware for API routes
 */
export function createValidationMiddleware(
    schema?: z.ZodSchema,
    options?: SecurityValidationOptions
) {
    const validator = new SecurityValidator(options)

    return async function validationMiddleware(
        request: NextRequest
    ): Promise<{ isValid: boolean; data?: any; response?: NextResponse }> {
        try {
            // Get request body
            let body: any = {}

            if (request.method !== 'GET' && request.method !== 'DELETE') {
                const contentType = request.headers.get('content-type') || ''

                if (contentType.includes('application/json')) {
                    body = await request.json()
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    const formData = await request.formData()
                    body = Object.fromEntries(formData.entries())
                }
            }

            // Add query parameters
            const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries())
            const allData = { ...body, ...queryParams }

            // Security validation
            const securityResult = validator.validateInput(allData)

            if (!securityResult.isValid) {
                // Log security violation
                await EnhancedAuditService.logSuspiciousActivity(
                    'Input validation failed',
                    undefined,
                    {
                        errors: securityResult.errors,
                        threats: securityResult.threats,
                        path: request.nextUrl.pathname,
                        method: request.method
                    },
                    request
                )

                return {
                    isValid: false,
                    response: NextResponse.json(
                        {
                            success: false,
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Input validation failed',
                                details: securityResult.errors
                            }
                        },
                        { status: 400 }
                    )
                }
            }

            // Schema validation if provided
            if (schema) {
                try {
                    const validatedData = schema.parse(securityResult.sanitizedData)
                    return { isValid: true, data: validatedData }
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return {
                            isValid: false,
                            response: NextResponse.json(
                                {
                                    success: false,
                                    error: {
                                        code: 'SCHEMA_VALIDATION_ERROR',
                                        message: 'Schema validation failed',
                                        details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
                                    }
                                },
                                { status: 400 }
                            )
                        }
                    }
                    throw error
                }
            }

            return { isValid: true, data: securityResult.sanitizedData }

        } catch (error) {
            console.error('Validation middleware error:', error)

            return {
                isValid: false,
                response: NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Validation failed'
                        }
                    },
                    { status: 500 }
                )
            }
        }
    }
}

/**
 * Validate file uploads
 */
export function validateFileUpload(
    file: File,
    options: {
        maxSize: number
        allowedTypes: string[]
        allowedExtensions: string[]
        scanForMalware?: boolean
    }
): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        threats: []
    }

    // Check file size
    if (file.size > options.maxSize) {
        result.isValid = false
        result.errors.push(`File size ${file.size} exceeds maximum ${options.maxSize}`)
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
        result.isValid = false
        result.errors.push(`File type ${file.type} not allowed`)
        result.threats.push(`Potentially malicious file type: ${file.type}`)
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !options.allowedExtensions.includes(extension)) {
        result.isValid = false
        result.errors.push(`File extension .${extension} not allowed`)
        result.threats.push(`Potentially dangerous file extension: .${extension}`)
    }

    // Check for double extensions (e.g., file.txt.exe)
    const parts = file.name.split('.')
    if (parts.length > 2) {
        const suspiciousExtensions = ['exe', 'bat', 'cmd', 'scr', 'pif', 'com']
        for (let i = 1; i < parts.length - 1; i++) {
            if (suspiciousExtensions.includes(parts[i].toLowerCase())) {
                result.isValid = false
                result.threats.push(`Double extension detected: ${file.name}`)
                break
            }
        }
    }

    // Basic malware patterns in filename
    const malwarePatterns = [
        /virus/i,
        /trojan/i,
        /malware/i,
        /backdoor/i,
        /keylog/i,
        /rootkit/i
    ]

    for (const pattern of malwarePatterns) {
        if (pattern.test(file.name)) {
            result.isValid = false
            result.threats.push(`Suspicious filename pattern: ${file.name}`)
            break
        }
    }

    return result
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    store: Map<string, { count: number; resetTime: number }> = new Map()
): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = `rate_limit:${identifier}`
    const current = store.get(key)

    if (!current || now > current.resetTime) {
        // First request or window reset
        const resetTime = now + windowMs
        store.set(key, { count: 1, resetTime })
        return { allowed: true, remaining: limit - 1, resetTime }
    }

    if (current.count >= limit) {
        // Rate limit exceeded
        return { allowed: false, remaining: 0, resetTime: current.resetTime }
    }

    // Increment counter
    current.count++
    store.set(key, current)

    return { allowed: true, remaining: limit - current.count, resetTime: current.resetTime }
}

/**
 * Create comprehensive security middleware
 */
export function createSecurityValidationMiddleware(options?: {
    validation?: SecurityValidationOptions
    schema?: z.ZodSchema
    rateLimit?: { limit: number; windowMs: number }
}) {
    const validationMiddleware = createValidationMiddleware(options?.schema, options?.validation)
    const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

    return async function securityMiddleware(
        request: NextRequest
    ): Promise<{ isValid: boolean; data?: any; response?: NextResponse }> {
        // Rate limiting
        if (options?.rateLimit) {
            const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

            const rateResult = validateRateLimit(
                ip,
                options.rateLimit.limit,
                options.rateLimit.windowMs,
                rateLimitStore
            )

            if (!rateResult.allowed) {
                return {
                    isValid: false,
                    response: NextResponse.json(
                        {
                            success: false,
                            error: {
                                code: 'RATE_LIMIT_EXCEEDED',
                                message: 'Too many requests'
                            }
                        },
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': options.rateLimit.limit.toString(),
                                'X-RateLimit-Remaining': rateResult.remaining.toString(),
                                'X-RateLimit-Reset': Math.ceil(rateResult.resetTime / 1000).toString()
                            }
                        }
                    )
                }
            }
        }

        // Input validation
        return await validationMiddleware(request)
    }
}