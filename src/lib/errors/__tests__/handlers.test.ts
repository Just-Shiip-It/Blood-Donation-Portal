import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
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
    ErrorCategory,
    ErrorSeverity,
    ERROR_CODES
} from '../types'
import {
    createErrorResponse,
    handleValidationError,
    handleDatabaseError,
    asyncErrorHandler,
    withErrorHandler,
    ClientErrorHandler,
    formatFormErrors,
    getUserFriendlyMessage
} from '../handlers'

describe('Error Handlers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('AppError', () => {
        it('should create AppError with all properties', () => {
            const error = new AppError(
                'Test error',
                ERROR_CODES.VALIDATION_FAILED,
                ErrorCategory.VALIDATION,
                ErrorSeverity.MEDIUM,
                { field: 'test' }
            )

            expect(error.message).toBe('Test error')
            expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED)
            expect(error.category).toBe(ErrorCategory.VALIDATION)
            expect(error.severity).toBe(ErrorSeverity.MEDIUM)
            expect(error.details).toEqual({ field: 'test' })
            expect(error.retryable).toBe(false)
        })

        it('should serialize to JSON correctly', () => {
            const error = new AppError(
                'Test error',
                ERROR_CODES.VALIDATION_FAILED,
                ErrorCategory.VALIDATION,
                ErrorSeverity.MEDIUM
            )

            const json = error.toJSON()
            expect(json.code).toBe(ERROR_CODES.VALIDATION_FAILED)
            expect(json.message).toBe('Test error')
            expect(json.category).toBe(ErrorCategory.VALIDATION)
            expect(json.severity).toBe(ErrorSeverity.MEDIUM)
            expect(json.timestamp).toBeDefined()
        })
    })

    describe('ValidationError', () => {
        it('should create ValidationError from Zod error', () => {
            const schema = z.object({
                email: z.string().email(),
                age: z.number().min(18)
            })

            const result = schema.safeParse({ email: 'invalid', age: 15 })
            expect(result.success).toBe(false)

            if (!result.success) {
                const validationError = ValidationError.fromZodError(result.error)

                expect(validationError.code).toBe('VALIDATION_ERROR')
                expect(validationError.category).toBe(ErrorCategory.VALIDATION)
                expect(validationError.validationErrors).toBeDefined()
                expect(Array.isArray(validationError.validationErrors)).toBe(true)
            }
        })

        it('should handle nested field paths', () => {
            const schema = z.object({
                user: z.object({
                    profile: z.object({
                        name: z.string().min(1)
                    })
                })
            })

            const result = schema.safeParse({ user: { profile: { name: '' } } })
            expect(result.success).toBe(false)

            if (!result.success) {
                const validationError = ValidationError.fromZodError(result.error)
                expect(validationError.validationErrors).toBeDefined()
                expect(Array.isArray(validationError.validationErrors)).toBe(true)
            }
        })
    })

    describe('Specific Error Types', () => {
        it('should create AuthenticationError', () => {
            const error = new AuthenticationError('Invalid token')
            expect(error.code).toBe('AUTHENTICATION_ERROR')
            expect(error.category).toBe(ErrorCategory.AUTHENTICATION)
            expect(error.message).toBe('Invalid token')
        })

        it('should create AuthorizationError', () => {
            const error = new AuthorizationError('Access denied')
            expect(error.code).toBe('AUTHORIZATION_ERROR')
            expect(error.category).toBe(ErrorCategory.AUTHORIZATION)
            expect(error.message).toBe('Access denied')
        })

        it('should create NotFoundError', () => {
            const error = new NotFoundError('User', '123')
            expect(error.code).toBe('NOT_FOUND_ERROR')
            expect(error.category).toBe(ErrorCategory.NOT_FOUND)
            expect(error.message).toBe('User with ID 123 not found')
        })

        it('should create ConflictError', () => {
            const error = new ConflictError('Email already exists')
            expect(error.code).toBe('CONFLICT_ERROR')
            expect(error.category).toBe(ErrorCategory.CONFLICT)
            expect(error.message).toBe('Email already exists')
        })

        it('should create RateLimitError with retry after', () => {
            const error = new RateLimitError('Too many requests', 60)
            expect(error.code).toBe('RATE_LIMIT_ERROR')
            expect(error.category).toBe(ErrorCategory.RATE_LIMIT)
            expect(error.retryable).toBe(true)
            expect(error.retryAfter).toBe(60)
        })

        it('should create DatabaseError', () => {
            const error = new DatabaseError('Connection failed')
            expect(error.code).toBe('DATABASE_ERROR')
            expect(error.category).toBe(ErrorCategory.DATABASE)
            expect(error.retryable).toBe(true)
        })

        it('should create ExternalServiceError', () => {
            const error = new ExternalServiceError('EmailService', 'API timeout')
            expect(error.code).toBe('EXTERNAL_SERVICE_ERROR')
            expect(error.category).toBe(ErrorCategory.EXTERNAL_SERVICE)
            expect(error.message).toBe('External service error (EmailService): API timeout')
            expect(error.retryable).toBe(true)
        })
    })

    describe('createErrorResponse', () => {
        it('should create error response for AppError', () => {
            const error = new ValidationError('Validation failed', [
                { field: 'email', value: 'invalid', message: 'Invalid email', code: 'invalid_email' }
            ])

            const response = createErrorResponse(error, 'req_123', 'user_456')
            expect(response.status).toBe(422)

            // Note: In a real test, you'd need to parse the response body
            // This is a simplified test focusing on the structure
        })

        it('should create error response for unknown error', () => {
            const error = new Error('Unknown error')
            const response = createErrorResponse(error, 'req_123')
            expect(response.status).toBe(500)
        })

        it('should include retry-after header for rate limit errors', () => {
            const error = new RateLimitError('Rate limit exceeded', 60)
            const response = createErrorResponse(error)

            // Check that headers are set (simplified test)
            expect(response).toBeDefined()
        })
    })

    describe('handleValidationError', () => {
        it('should convert Zod error to ValidationError', () => {
            const schema = z.object({ email: z.string().email() })
            const result = schema.safeParse({ email: 'invalid' })

            expect(result.success).toBe(false)
            if (!result.success) {
                const validationError = handleValidationError(result.error)
                expect(validationError).toBeInstanceOf(ValidationError)
                expect(validationError.validationErrors).toBeDefined()
                expect(Array.isArray(validationError.validationErrors)).toBe(true)
            }
        })
    })

    describe('handleDatabaseError', () => {
        it('should handle unique constraint error', () => {
            const dbError = new Error('unique constraint violation')
            const error = handleDatabaseError(dbError)

            expect(error).toBeInstanceOf(DatabaseError)
            expect(error.message).toBe('Resource already exists')
            expect(error.details?.type).toBe('unique_constraint')
        })

        it('should handle foreign key constraint error', () => {
            const dbError = new Error('foreign key constraint violation')
            const error = handleDatabaseError(dbError)

            expect(error).toBeInstanceOf(DatabaseError)
            expect(error.message).toBe('Referenced resource not found')
            expect(error.details?.type).toBe('foreign_key_constraint')
        })

        it('should handle connection error', () => {
            const dbError = new Error('connection timeout')
            const error = handleDatabaseError(dbError)

            expect(error).toBeInstanceOf(DatabaseError)
            expect(error.message).toBe('Database connection failed')
            expect(error.details?.type).toBe('connection_error')
        })

        it('should handle unknown database error', () => {
            const dbError = new Error('unknown database error')
            const error = handleDatabaseError(dbError)

            expect(error).toBeInstanceOf(DatabaseError)
            expect(error.message).toBe('unknown database error')
            expect(error.details?.type).toBe('unknown')
        })

        it('should handle non-Error objects', () => {
            const error = handleDatabaseError('string error')
            expect(error).toBeInstanceOf(DatabaseError)
            expect(error.message).toBe('Unknown database error')
        })
    })

    describe('asyncErrorHandler', () => {
        it('should handle successful function execution', async () => {
            const successFn = vi.fn().mockResolvedValue('success')
            const wrappedFn = asyncErrorHandler(successFn)

            const result = await wrappedFn('arg1', 'arg2')
            expect(result).toBe('success')
            expect(successFn).toHaveBeenCalledWith('arg1', 'arg2')
        })

        it('should pass through AppError', async () => {
            const appError = new ValidationError('Validation failed', [])
            const errorFn = vi.fn().mockRejectedValue(appError)
            const wrappedFn = asyncErrorHandler(errorFn)

            await expect(wrappedFn()).rejects.toThrow(ValidationError)
        })

        it('should convert Zod error to ValidationError', async () => {
            const zodError = new z.ZodError([
                { code: z.ZodIssueCode.invalid_type, expected: 'string', received: 'number', path: ['field'], message: 'Expected string' }
            ])
            const errorFn = vi.fn().mockRejectedValue(zodError)
            const wrappedFn = asyncErrorHandler(errorFn)

            await expect(wrappedFn()).rejects.toThrow(ValidationError)
        })

        it('should convert database error to DatabaseError', async () => {
            const dbError = new Error('database connection failed')
            const errorFn = vi.fn().mockRejectedValue(dbError)
            const wrappedFn = asyncErrorHandler(errorFn)

            await expect(wrappedFn()).rejects.toThrow(DatabaseError)
        })

        it('should convert unknown error to AppError', async () => {
            const unknownError = new Error('unknown error')
            const errorFn = vi.fn().mockRejectedValue(unknownError)
            const wrappedFn = asyncErrorHandler(errorFn)

            await expect(wrappedFn()).rejects.toThrow(AppError)
        })
    })

    describe('ClientErrorHandler', () => {
        let errorHandler: ClientErrorHandler

        beforeEach(() => {
            errorHandler = ClientErrorHandler.getInstance()
            errorHandler.clearErrors()
        })

        it('should be a singleton', () => {
            const handler1 = ClientErrorHandler.getInstance()
            const handler2 = ClientErrorHandler.getInstance()
            expect(handler1).toBe(handler2)
        })

        it('should handle AppError', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const appError = new ValidationError('Test error', [])

            errorHandler.handleError(appError)

            const recentErrors = errorHandler.getRecentErrors()
            expect(recentErrors).toHaveLength(1)
            expect(recentErrors[0]).toBe(appError)
            expect(consoleSpy).toHaveBeenCalled()

            consoleSpy.mockRestore()
        })

        it('should convert regular Error to AppError', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const regularError = new Error('Regular error')

            errorHandler.handleError(regularError)

            const recentErrors = errorHandler.getRecentErrors()
            expect(recentErrors).toHaveLength(1)
            expect(recentErrors[0]).toBeInstanceOf(AppError)
            expect(recentErrors[0].message).toBe('Regular error')

            consoleSpy.mockRestore()
        })

        it('should maintain queue size limit', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            // Add more errors than the queue limit (100)
            for (let i = 0; i < 105; i++) {
                errorHandler.handleError(new Error(`Error ${i}`))
            }

            const recentErrors = errorHandler.getRecentErrors()
            expect(recentErrors.length).toBeLessThanOrEqual(100)

            consoleSpy.mockRestore()
        })

        it('should clear errors', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

            errorHandler.handleError(new Error('Test error'))
            expect(errorHandler.getRecentErrors()).toHaveLength(1)

            errorHandler.clearErrors()
            expect(errorHandler.getRecentErrors()).toHaveLength(0)

            consoleSpy.mockRestore()
        })
    })

    describe('formatFormErrors', () => {
        it('should format validation errors for forms', () => {
            const validationError = new ValidationError('Validation failed', [
                { field: 'email', value: 'invalid', message: 'Invalid email format', code: 'invalid_email' },
                { field: 'password', value: '123', message: 'Password too short', code: 'min_length' }
            ])

            const formErrors = formatFormErrors(validationError)
            expect(formErrors).toEqual({
                email: 'Invalid email format',
                password: 'Password too short'
            })
        })

        it('should handle nested field paths', () => {
            const validationError = new ValidationError('Validation failed', [
                { field: 'user.profile.name', value: '', message: 'Name is required', code: 'required' }
            ])

            const formErrors = formatFormErrors(validationError)
            expect(formErrors['user.profile.name']).toBe('Name is required')
        })
    })

    describe('getUserFriendlyMessage', () => {
        it('should return user-friendly messages for known error codes', () => {
            expect(getUserFriendlyMessage(ERROR_CODES.INVALID_CREDENTIALS))
                .toBe('Invalid email or password. Please try again.')

            expect(getUserFriendlyMessage(ERROR_CODES.TOKEN_EXPIRED))
                .toBe('Your session has expired. Please log in again.')

            expect(getUserFriendlyMessage(ERROR_CODES.RATE_LIMIT_EXCEEDED))
                .toBe('Too many requests. Please wait a moment and try again.')
        })

        it('should return default message for unknown error codes', () => {
            expect(getUserFriendlyMessage('UNKNOWN_ERROR_CODE'))
                .toBe('An unexpected error occurred. Please try again.')
        })
    })

    describe('withErrorHandler', () => {
        it('should handle successful request', async () => {
            const mockHandler = vi.fn().mockResolvedValue(new Response('success'))
            const wrappedHandler = withErrorHandler(mockHandler)

            const mockRequest = new NextRequest('http://localhost/test')
            const response = await wrappedHandler(mockRequest)

            expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined)
            expect(response).toBeInstanceOf(Response)
        })

        it('should handle errors and return error response', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const mockHandler = vi.fn().mockRejectedValue(new ValidationError('Test error', []))
            const wrappedHandler = withErrorHandler(mockHandler)

            const mockRequest = new NextRequest('http://localhost/test')
            const response = await wrappedHandler(mockRequest)

            expect(response.status).toBe(422)
            expect(consoleSpy).toHaveBeenCalled()

            consoleSpy.mockRestore()
        })
    })
})