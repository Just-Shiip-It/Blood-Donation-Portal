import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    ApiErrorResponse,
    ErrorCategory,
    ErrorSeverity,
    ERROR_CODES
} from './types'

// Generate unique request ID
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Enhanced error response builder
export function createErrorResponse(
    error: AppError | Error,
    requestId?: string,
    userId?: string
): NextResponse<ApiErrorResponse> {
    const id = requestId || generateRequestId()

    if (error instanceof AppError) {
        const statusCode = getStatusCodeFromCategory(error.category)

        const errorResponse: ApiErrorResponse = {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                category: error.category,
                severity: error.severity,
                timestamp: error.timestamp,
                requestId: id,
                userId: userId || error.userId,
                retryable: error.retryable,
                retryAfter: error.retryAfter
            }
        }

        // Add validation details for ValidationError
        if (error instanceof ValidationError) {
            errorResponse.error.details = error.validationErrors
        } else if (error.details) {
            errorResponse.error.details = error.details as Record<string, string[]>
        }

        return NextResponse.json(errorResponse, {
            status: statusCode,
            headers: {
                'X-Request-ID': id,
                ...(error.retryAfter && { 'Retry-After': error.retryAfter.toString() })
            }
        })
    }

    // Handle unknown errors
    const statusCode = 500
    const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: process.env.NODE_ENV === 'development'
                ? error.message
                : 'An unexpected error occurred',
            category: ErrorCategory.SERVER_ERROR,
            severity: ErrorSeverity.CRITICAL,
            timestamp: new Date().toISOString(),
            requestId: id,
            userId,
            retryable: false
        }
    }

    return NextResponse.json(errorResponse, {
        status: statusCode,
        headers: { 'X-Request-ID': id }
    })
}

// Map error categories to HTTP status codes
function getStatusCodeFromCategory(category: ErrorCategory): number {
    switch (category) {
        case ErrorCategory.VALIDATION:
            return 422
        case ErrorCategory.AUTHENTICATION:
            return 401
        case ErrorCategory.AUTHORIZATION:
            return 403
        case ErrorCategory.NOT_FOUND:
            return 404
        case ErrorCategory.CONFLICT:
            return 409
        case ErrorCategory.RATE_LIMIT:
            return 429
        case ErrorCategory.DATABASE:
        case ErrorCategory.EXTERNAL_SERVICE:
        case ErrorCategory.SERVER_ERROR:
            return 500
        case ErrorCategory.NETWORK:
            return 503
        default:
            return 500
    }
}

// Validation error handler for Zod schemas
export function handleValidationError(zodError: z.ZodError): ValidationError {
    return ValidationError.fromZodError(zodError)
}

// Database error handler
export function handleDatabaseError(error: unknown): DatabaseError {
    if (error instanceof Error) {
        // Handle specific database errors
        if (error.message.includes('unique constraint')) {
            return new DatabaseError('Resource already exists', {
                originalError: error.message,
                type: 'unique_constraint'
            })
        }

        if (error.message.includes('foreign key constraint')) {
            return new DatabaseError('Referenced resource not found', {
                originalError: error.message,
                type: 'foreign_key_constraint'
            })
        }

        if (error.message.includes('connection')) {
            return new DatabaseError('Database connection failed', {
                originalError: error.message,
                type: 'connection_error'
            })
        }

        return new DatabaseError(error.message, {
            originalError: error.message,
            type: 'unknown'
        })
    }

    return new DatabaseError('Unknown database error', {
        originalError: String(error),
        type: 'unknown'
    })
}

// Async error wrapper for API routes
export function asyncErrorHandler<T extends any[], R>(
    fn: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args)
        } catch (error) {
            if (error instanceof AppError) {
                throw error
            }

            // Handle Zod validation errors
            if (error instanceof z.ZodError) {
                throw handleValidationError(error)
            }

            // Handle database errors
            if (error instanceof Error && (
                error.message.includes('database') ||
                error.message.includes('connection') ||
                error.message.includes('constraint')
            )) {
                throw handleDatabaseError(error)
            }

            // Handle unknown errors
            throw new AppError(
                error instanceof Error ? error.message : 'Unknown error occurred',
                ERROR_CODES.INTERNAL_SERVER_ERROR,
                ErrorCategory.SERVER_ERROR,
                ErrorSeverity.CRITICAL,
                { originalError: String(error) }
            )
        }
    }
}

// API route error handler middleware
export function withErrorHandler(
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
        const requestId = generateRequestId()

        try {
            return await handler(req, context)
        } catch (error) {
            // Log error for monitoring
            console.error(`[${requestId}] API Error:`, error)

            // Extract user ID from request if available
            const userId = req.headers.get('x-user-id') || undefined

            return createErrorResponse(error as Error, requestId, userId)
        }
    }
}

// Client-side error handler
export class ClientErrorHandler {
    private static instance: ClientErrorHandler
    private errorQueue: AppError[] = []
    private maxQueueSize = 100

    static getInstance(): ClientErrorHandler {
        if (!ClientErrorHandler.instance) {
            ClientErrorHandler.instance = new ClientErrorHandler()
        }
        return ClientErrorHandler.instance
    }

    handleError(error: Error | AppError, context?: Record<string, unknown>): void {
        let appError: AppError

        if (error instanceof AppError) {
            appError = error
        } else {
            appError = new AppError(
                error.message,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
                ErrorCategory.SERVER_ERROR,
                ErrorSeverity.MEDIUM,
                { context, originalError: error.message }
            )
        }

        // Add to error queue
        this.addToQueue(appError)

        // Log error
        console.error('Client Error:', appError.toJSON())

        // Send to error reporting service in production
        if (process.env.NODE_ENV === 'production') {
            this.reportError(appError)
        }
    }

    private addToQueue(error: AppError): void {
        this.errorQueue.push(error)

        // Maintain queue size
        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue.shift()
        }
    }

    private async reportError(error: AppError): Promise<void> {
        try {
            // Send error to monitoring service
            await fetch('/api/errors/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(error.toJSON())
            })
        } catch (reportingError) {
            console.error('Failed to report error:', reportingError)
        }
    }

    getRecentErrors(): AppError[] {
        return [...this.errorQueue]
    }

    clearErrors(): void {
        this.errorQueue = []
    }
}

// Form validation error formatter
export function formatFormErrors(error: ValidationError): Record<string, string> {
    const formErrors: Record<string, string> = {}

    error.validationErrors.forEach(validationError => {
        formErrors[validationError.field] = validationError.message
    })

    return formErrors
}

// User-friendly error messages
export const USER_FRIENDLY_MESSAGES = {
    [ERROR_CODES.VALIDATION_FAILED]: 'Please check your input and try again.',
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
    [ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email address before continuing.',
    [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
    [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource could not be found.',
    [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'This resource already exists.',
    [ERROR_CODES.DONOR_NOT_ELIGIBLE]: 'You are not currently eligible to donate. Please check your eligibility status.',
    [ERROR_CODES.APPOINTMENT_UNAVAILABLE]: 'This appointment slot is no longer available.',
    [ERROR_CODES.INSUFFICIENT_INVENTORY]: 'Insufficient blood inventory for this request.',
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
    [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again later.'
} as const

export function getUserFriendlyMessage(errorCode: string): string {
    return USER_FRIENDLY_MESSAGES[errorCode as keyof typeof USER_FRIENDLY_MESSAGES] ||
        'An unexpected error occurred. Please try again.'
}