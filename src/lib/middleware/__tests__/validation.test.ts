import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
    validateRequest,
    validateQuery,
    validateParams,
    validateFileUpload,
    sanitizeInput,
    sanitizeEmail,
    sanitizePhone,
    validateUUID,
    validateEmail,
    validatePhone,
    validateBloodType,
    validateDateRange,
    validateBatch,
    createRoleBasedValidator
} from '../validation'
import { ValidationError } from '@/lib/errors/types'

describe('Validation Middleware', () => {
    describe('validateRequest', () => {
        const testSchema = z.object({
            name: z.string().min(1),
            email: z.string().email(),
            age: z.number().min(18)
        })

        it('should validate valid request body', async () => {
            const validBody = { name: 'John', email: 'john@example.com', age: 25 }
            const mockRequest = {
                json: vi.fn().mockResolvedValue(validBody)
            } as unknown as NextRequest

            const validator = validateRequest(testSchema)
            const result = await validator(mockRequest)

            expect(result).toEqual(validBody)
            expect(mockRequest.json).toHaveBeenCalled()
        })

        it('should throw ValidationError for invalid request body', async () => {
            const invalidBody = { name: '', email: 'invalid-email', age: 15 }
            const mockRequest = {
                json: vi.fn().mockResolvedValue(invalidBody)
            } as unknown as NextRequest

            const validator = validateRequest(testSchema)

            await expect(validator(mockRequest)).rejects.toThrow(ValidationError)
        })

        it('should handle JSON parsing errors', async () => {
            const mockRequest = {
                json: vi.fn().mockRejectedValue(new SyntaxError('Invalid JSON'))
            } as unknown as NextRequest

            const validator = validateRequest(testSchema)

            await expect(validator(mockRequest)).rejects.toThrow(ValidationError)
        })

        it('should handle other errors during validation', async () => {
            const mockRequest = {
                json: vi.fn().mockRejectedValue(new Error('Network error'))
            } as unknown as NextRequest

            const validator = validateRequest(testSchema)

            await expect(validator(mockRequest)).rejects.toThrow()
        })
    })

    describe('validateQuery', () => {
        const querySchema = z.object({
            page: z.string().transform(val => parseInt(val, 10)),
            limit: z.string().transform(val => parseInt(val, 10)),
            search: z.string().optional()
        })

        it('should validate valid query parameters', () => {
            const mockRequest = {
                url: 'http://localhost/api/test?page=1&limit=10&search=test'
            } as NextRequest

            const validator = validateQuery(querySchema)
            const result = validator(mockRequest)

            expect(result).toEqual({
                page: 1,
                limit: 10,
                search: 'test'
            })
        })

        it('should handle multiple values for same parameter', () => {
            const multiValueSchema = z.object({
                tags: z.array(z.string()).or(z.string())
            })

            const mockRequest = {
                url: 'http://localhost/api/test?tags=tag1&tags=tag2'
            } as NextRequest

            const validator = validateQuery(multiValueSchema)
            const result = validator(mockRequest)

            expect(result.tags).toEqual(['tag1', 'tag2'])
        })

        it('should throw ValidationError for invalid query parameters', () => {
            const invalidQuerySchema = z.object({
                page: z.string().regex(/^\d+$/, 'Must be a number'),
                limit: z.string().regex(/^\d+$/, 'Must be a number')
            })

            const mockRequest = {
                url: 'http://localhost/api/test?page=invalid&limit=abc'
            } as NextRequest

            const validator = validateQuery(invalidQuerySchema)

            expect(() => validator(mockRequest)).toThrow(ValidationError)
        })

        it('should handle empty query parameters', () => {
            const optionalSchema = z.object({
                page: z.string().optional(),
                limit: z.string().optional()
            })

            const mockRequest = {
                url: 'http://localhost/api/test'
            } as NextRequest

            const validator = validateQuery(optionalSchema)
            const result = validator(mockRequest)

            expect(result).toEqual({})
        })
    })

    describe('validateParams', () => {
        const paramsSchema = z.object({
            id: z.string().uuid(),
            slug: z.string().min(1)
        })

        it('should validate valid path parameters', () => {
            const validParams = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                slug: 'test-slug'
            }

            const validator = validateParams(paramsSchema)
            const result = validator(validParams)

            expect(result).toEqual(validParams)
        })

        it('should throw ValidationError for invalid parameters', () => {
            const invalidParams = {
                id: 'invalid-uuid',
                slug: ''
            }

            const validator = validateParams(paramsSchema)

            expect(() => validator(invalidParams)).toThrow(ValidationError)
        })

        it('should handle array parameters', () => {
            const params = {
                id: ['123e4567-e89b-12d3-a456-426614174000'],
                slug: 'test-slug'
            }

            const validator = validateParams(paramsSchema)

            expect(() => validator(params)).toThrow(ValidationError)
        })
    })

    describe('validateFileUpload', () => {
        const createMockFile = (overrides: Partial<File> = {}): File => {
            return {
                name: 'test.jpg',
                size: 1024 * 1024, // 1MB
                type: 'image/jpeg',
                ...overrides
            } as File
        }

        it('should validate valid file upload', () => {
            const validFile = createMockFile()

            expect(() => validateFileUpload(validFile)).not.toThrow()
        })

        it('should handle missing file when not required', () => {
            expect(() => validateFileUpload(null as any, { required: false })).not.toThrow()
        })

        it('should throw error for missing required file', () => {
            expect(() => validateFileUpload(null as any, { required: true })).toThrow(ValidationError)
        })

        it('should reject file that is too large', () => {
            const largeFile = createMockFile({ size: 11 * 1024 * 1024 }) // 11MB

            expect(() => validateFileUpload(largeFile, { maxSize: 10 * 1024 * 1024 })).toThrow(ValidationError)
        })

        it('should reject invalid file type', () => {
            const invalidFile = createMockFile({ type: 'application/exe' })

            expect(() => validateFileUpload(invalidFile)).toThrow(ValidationError)
        })

        it('should reject invalid file extension', () => {
            const invalidFile = createMockFile({ name: 'test.exe' })

            expect(() => validateFileUpload(invalidFile)).toThrow(ValidationError)
        })

        it('should reject file with invalid name', () => {
            const invalidFile = createMockFile({ name: 'file@#$.jpg' })

            expect(() => validateFileUpload(invalidFile)).toThrow(ValidationError)
        })

        it('should reject file with name too long', () => {
            const invalidFile = createMockFile({ name: 'a'.repeat(260) + '.jpg' })

            expect(() => validateFileUpload(invalidFile)).toThrow(ValidationError)
        })

        it('should allow custom file types and extensions', () => {
            const customFile = createMockFile({ name: 'test.txt', type: 'text/plain' })

            expect(() => validateFileUpload(customFile, {
                allowedTypes: ['text/plain'],
                allowedExtensions: ['.txt']
            })).not.toThrow()
        })
    })

    describe('sanitization functions', () => {
        describe('sanitizeInput', () => {
            it('should remove HTML tags and dangerous content', () => {
                expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('scriptalert("xss")/scripthello')
                expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")')
                expect(sanitizeInput('<div onclick="alert()">text</div>')).toBe('div "alert()"text/div')
                expect(sanitizeInput('  hello world  ')).toBe('hello world')
            })

            it('should preserve safe content', () => {
                expect(sanitizeInput('Hello World 123')).toBe('Hello World 123')
                expect(sanitizeInput('user@example.com')).toBe('user@example.com')
            })
        })

        describe('sanitizeEmail', () => {
            it('should convert to lowercase and trim', () => {
                expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com')
                expect(sanitizeEmail('Test.User@Domain.Com')).toBe('test.user@domain.com')
            })
        })

        describe('sanitizePhone', () => {
            it('should remove invalid characters and preserve valid ones', () => {
                expect(sanitizePhone('abc123-456-7890def')).toBe('123-456-7890')
                expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
                expect(sanitizePhone('  555.123.4567  ')).toBe('555.123.4567')
            })
        })
    })

    describe('validation helper functions', () => {
        describe('validateUUID', () => {
            it('should validate correct UUIDs', () => {
                expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
                expect(validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
            })

            it('should reject invalid UUIDs', () => {
                expect(validateUUID('not-a-uuid')).toBe(false)
                expect(validateUUID('123e4567-e89b-12d3-a456')).toBe(false)
                expect(validateUUID('')).toBe(false)
            })
        })

        describe('validateEmail', () => {
            it('should validate correct emails', () => {
                expect(validateEmail('user@example.com')).toBe(true)
                expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true)
            })

            it('should reject invalid emails', () => {
                expect(validateEmail('invalid-email')).toBe(false)
                expect(validateEmail('@example.com')).toBe(false)
                expect(validateEmail('user@')).toBe(false)
            })
        })

        describe('validatePhone', () => {
            it('should validate correct phone numbers', () => {
                expect(validatePhone('1234567890')).toBe(true)
                expect(validatePhone('+1 (555) 123-4567')).toBe(true)
                expect(validatePhone('555-123-4567')).toBe(true)
            })

            it('should reject invalid phone numbers', () => {
                expect(validatePhone('123')).toBe(false)
                expect(validatePhone('abc123')).toBe(false)
                expect(validatePhone('')).toBe(false)
            })
        })

        describe('validateBloodType', () => {
            it('should validate correct blood types', () => {
                const validTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
                validTypes.forEach(type => {
                    expect(validateBloodType(type)).toBe(true)
                })
            })

            it('should reject invalid blood types', () => {
                expect(validateBloodType('X+')).toBe(false)
                expect(validateBloodType('A')).toBe(false)
                expect(validateBloodType('')).toBe(false)
            })
        })

        describe('validateDateRange', () => {
            it('should validate correct date ranges', () => {
                expect(validateDateRange('2024-01-01', '2024-01-31')).toBe(true)
                expect(validateDateRange('2024-01-01', '2024-01-01')).toBe(true) // Same date
            })

            it('should reject invalid date ranges', () => {
                expect(validateDateRange('2024-01-31', '2024-01-01')).toBe(false) // End before start
            })
        })
    })

    describe('validateBatch', () => {
        const itemSchema = z.object({
            name: z.string().min(1),
            age: z.number().min(0)
        })

        it('should validate batch of items', () => {
            const items = [
                { name: 'John', age: 25 },
                { name: 'Jane', age: 30 },
                { name: '', age: -5 }, // Invalid
                { name: 'Bob', age: 35 }
            ]

            const result = validateBatch(itemSchema, items)

            expect(result.valid).toHaveLength(3)
            expect(result.invalid).toHaveLength(1)
            expect(result.invalid[0].index).toBe(2)
        })

        it('should handle empty batch', () => {
            const result = validateBatch(itemSchema, [])
            expect(result.valid).toHaveLength(0)
            expect(result.invalid).toHaveLength(0)
        })

        it('should handle all valid items', () => {
            const items = [
                { name: 'John', age: 25 },
                { name: 'Jane', age: 30 }
            ]

            const result = validateBatch(itemSchema, items)
            expect(result.valid).toHaveLength(2)
            expect(result.invalid).toHaveLength(0)
        })
    })

    describe('createRoleBasedValidator', () => {
        const baseSchema = z.object({
            name: z.string().min(1),
            email: z.string().email()
        })

        const roleValidations = {
            admin: z.object({
                permissions: z.array(z.string()).min(1)
            }),
            user: z.object({
                age: z.number().min(18)
            })
        }

        it('should validate with base schema only for unknown role', () => {
            const validator = createRoleBasedValidator(baseSchema, roleValidations)
            const data = { name: 'John', email: 'john@example.com' }

            expect(() => validator(data, 'unknown_role')).not.toThrow()
        })

        it('should validate with role-specific schema for known role', () => {
            const validator = createRoleBasedValidator(baseSchema, roleValidations)
            const adminData = {
                name: 'Admin',
                email: 'admin@example.com',
                permissions: ['read', 'write']
            }

            expect(() => validator(adminData, 'admin')).not.toThrow()
        })

        it('should throw error for invalid base schema', () => {
            const validator = createRoleBasedValidator(baseSchema, roleValidations)
            const invalidData = { name: '', email: 'invalid-email' }

            expect(() => validator(invalidData, 'user')).toThrow(ValidationError)
        })

        it('should throw error for invalid role-specific schema', () => {
            const validator = createRoleBasedValidator(baseSchema, roleValidations)
            const invalidRoleData = {
                name: 'User',
                email: 'user@example.com',
                age: 15 // Too young
            }

            expect(() => validator(invalidRoleData, 'user')).toThrow(ValidationError)
        })
    })
})