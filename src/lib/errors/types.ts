import { z } from 'zod'

// Error severity levels
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
    VALIDATION = 'validation',
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    NOT_FOUND = 'not_found',
    CONFLICT = 'conflict',
    RATE_LIMIT = 'rate_limit',
    SERVER_ERROR = 'server_error',
    EXTERNAL_SERVICE = 'external_service',
    DATABASE = 'database',
    NETWORK = 'network'
}

// Base error interface
export interface BaseError {
    code: string
    message: string
    category: ErrorCategory
    severity: ErrorSeverity
    timestamp: string
    requestId?: string
    userId?: string
    details?: Record<string, unknown>
    stack?: string
}

// Validation error details
export interface ValidationErrorDetails {
    field: string
    value: unknown
    message: string
    code: string
}

// Enhanced API error response
export interface ApiErrorResponse {
    success: false
    error: {
        code: string
        message: string
        category: ErrorCategory
        severity: ErrorSeverity
        details?: Record<string, string[]> | ValidationErrorDetails[]
        timestamp: string
        requestId: string
        userId?: string
        retryable?: boolean
        retryAfter?: number
    }
}

// Enhanced API success response
export interface ApiSuccessResponse<T> {
    success: true
    data: T
    meta?: {
        pagination?: {
            page: number
            limit: number
            total: number
            totalPages: number
            hasNext: boolean
            hasPrev: boolean
        }
        timestamp: string
        requestId: string
        version?: string
    }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Custom error classes
export class AppError extends Error {
    public readonly code: string
    public readonly category: ErrorCategory
    public readonly severity: ErrorSeverity
    public readonly timestamp: string
    public readonly requestId?: string
    public readonly userId?: string
    public readonly details?: Record<string, unknown>
    public readonly retryable: boolean
    public readonly retryAfter?: number

    constructor(
        message: string,
        code: string,
        category: ErrorCategory,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        details?: Record<string, unknown>,
        retryable: boolean = false,
        retryAfter?: number
    ) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.category = category
        this.severity = severity
        this.timestamp = new Date().toISOString()
        this.details = details
        this.retryable = retryable
        this.retryAfter = retryAfter

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError)
        }
    }

    toJSON(): BaseError {
        return {
            code: this.code,
            message: this.message,
            category: this.category,
            severity: this.severity,
            timestamp: this.timestamp,
            requestId: this.requestId,
            userId: this.userId,
            details: this.details,
            stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
        }
    }
}

export class ValidationError extends AppError {
    public readonly validationErrors: ValidationErrorDetails[]

    constructor(
        message: string,
        validationErrors: ValidationErrorDetails[],
        details?: Record<string, unknown>
    ) {
        super(
            message,
            'VALIDATION_ERROR',
            ErrorCategory.VALIDATION,
            ErrorSeverity.LOW,
            details
        )
        this.name = 'ValidationError'
        this.validationErrors = validationErrors
    }

    static fromZodError(zodError: z.ZodError): ValidationError {
        const issues = zodError.issues || []
        const validationErrors: ValidationErrorDetails[] = issues.map(issue => ({
            field: issue.path.join('.'),
            value: 'received' in issue ? issue.received : 'unknown',
            message: issue.message,
            code: issue.code
        }))

        return new ValidationError(
            'Validation failed',
            validationErrors,
            { zodError: issues }
        )
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
        super(
            message,
            'AUTHENTICATION_ERROR',
            ErrorCategory.AUTHENTICATION,
            ErrorSeverity.MEDIUM,
            details
        )
        this.name = 'AuthenticationError'
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Insufficient permissions', details?: Record<string, unknown>) {
        super(
            message,
            'AUTHORIZATION_ERROR',
            ErrorCategory.AUTHORIZATION,
            ErrorSeverity.MEDIUM,
            details
        )
        this.name = 'AuthorizationError'
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string, details?: Record<string, unknown>) {
        const message = id
            ? `${resource} with ID ${id} not found`
            : `${resource} not found`

        super(
            message,
            'NOT_FOUND_ERROR',
            ErrorCategory.NOT_FOUND,
            ErrorSeverity.LOW,
            { resource, id, ...details }
        )
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(
            message,
            'CONFLICT_ERROR',
            ErrorCategory.CONFLICT,
            ErrorSeverity.MEDIUM,
            details
        )
        this.name = 'ConflictError'
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded', retryAfter?: number, details?: Record<string, unknown>) {
        super(
            message,
            'RATE_LIMIT_ERROR',
            ErrorCategory.RATE_LIMIT,
            ErrorSeverity.MEDIUM,
            details,
            true,
            retryAfter
        )
        this.name = 'RateLimitError'
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(
            message,
            'DATABASE_ERROR',
            ErrorCategory.DATABASE,
            ErrorSeverity.HIGH,
            details,
            true
        )
        this.name = 'DatabaseError'
    }
}

export class ExternalServiceError extends AppError {
    constructor(service: string, message: string, details?: Record<string, unknown>) {
        super(
            `External service error (${service}): ${message}`,
            'EXTERNAL_SERVICE_ERROR',
            ErrorCategory.EXTERNAL_SERVICE,
            ErrorSeverity.HIGH,
            { service, ...details },
            true
        )
        this.name = 'ExternalServiceError'
    }
}

// Error code constants
export const ERROR_CODES = {
    // Validation errors
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',

    // Authentication errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

    // Authorization errors
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    ROLE_NOT_AUTHORIZED: 'ROLE_NOT_AUTHORIZED',
    RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

    // Resource errors
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

    // Business logic errors
    DONOR_NOT_ELIGIBLE: 'DONOR_NOT_ELIGIBLE',
    APPOINTMENT_UNAVAILABLE: 'APPOINTMENT_UNAVAILABLE',
    INSUFFICIENT_INVENTORY: 'INSUFFICIENT_INVENTORY',
    BLOOD_REQUEST_EXPIRED: 'BLOOD_REQUEST_EXPIRED',

    // System errors
    DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
    EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]