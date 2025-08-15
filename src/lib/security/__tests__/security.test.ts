import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    encryptData,
    decryptData,
    hashPassword,
    verifyPassword,
    generateSecureToken,
    hashSensitiveData
} from '../encryption'
import {
    sanitizeHtml,
    sanitizeText,
    sanitizeEmail,
    sanitizeSqlInput,
    sanitizeObject,
    validateAndSanitizeFile
} from '../sanitization'
import { SecurityValidator } from '../validation'
import { createRateLimit, RATE_LIMIT_CONFIGS } from '../rate-limiting'
import { NextRequest } from 'next/server'

// Mock environment variables
vi.mock('process', () => ({
    env: {
        ENCRYPTION_KEY: 'test-encryption-key-32-characters',
        NODE_ENV: 'test'
    }
}))

describe('Encryption', () => {
    describe('encryptData and decryptData', () => {
        it('should encrypt and decrypt data correctly', () => {
            const originalData = 'sensitive information'
            const encrypted = encryptData(originalData)
            const decrypted = decryptData(encrypted)

            expect(encrypted).not.toBe(originalData)
            expect(decrypted).toBe(originalData)
        })

        it('should throw error for invalid encrypted data', () => {
            expect(() => decryptData('invalid-encrypted-data')).toThrow()
        })
    })

    describe('password hashing', () => {
        it('should hash password correctly', async () => {
            const password = 'testPassword123!'
            const hashedPassword = await hashPassword(password)

            expect(hashedPassword).not.toBe(password)
            expect(hashedPassword.length).toBeGreaterThan(50)
        })

        it('should verify password correctly', async () => {
            const password = 'testPassword123!'
            const hashedPassword = await hashPassword(password)

            const isValid = await verifyPassword(password, hashedPassword)
            const isInvalid = await verifyPassword('wrongPassword', hashedPassword)

            expect(isValid).toBe(true)
            expect(isInvalid).toBe(false)
        })
    })

    describe('generateSecureToken', () => {
        it('should generate secure token of correct length', () => {
            const token = generateSecureToken(32)
            expect(token).toHaveLength(64) // Hex encoding doubles the length
            expect(token).toMatch(/^[a-f0-9]+$/)
        })

        it('should generate different tokens each time', () => {
            const token1 = generateSecureToken()
            const token2 = generateSecureToken()
            expect(token1).not.toBe(token2)
        })
    })

    describe('hashSensitiveData', () => {
        it('should hash data consistently', async () => {
            const data = 'sensitive-data'
            const hash1 = await hashSensitiveData(data)
            const hash2 = await hashSensitiveData(data)

            expect(hash1).toBe(hash2)
            expect(hash1).not.toBe(data)
        })
    })
})

describe('Sanitization', () => {
    describe('sanitizeHtml', () => {
        it('should remove dangerous HTML tags', () => {
            const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>'
            const sanitized = sanitizeHtml(maliciousHtml)

            expect(sanitized).not.toContain('<script>')
            expect(sanitized).toContain('<p>Safe content</p>')
        })

        it('should handle empty or invalid input', () => {
            expect(sanitizeHtml('')).toBe('')
            expect(sanitizeHtml(null as any)).toBe('')
            expect(sanitizeHtml(undefined as any)).toBe('')
        })
    })

    describe('sanitizeText', () => {
        it('should remove HTML tags from text', () => {
            const textWithHtml = 'Hello <script>alert("xss")</script> World'
            const sanitized = sanitizeText(textWithHtml)

            expect(sanitized).toBe('Hello alert("xss") World')
        })

        it('should trim whitespace', () => {
            const textWithSpaces = '  Hello World  '
            const sanitized = sanitizeText(textWithSpaces)

            expect(sanitized).toBe('Hello World')
        })
    })

    describe('sanitizeEmail', () => {
        it('should normalize email addresses', () => {
            const email = '  TEST@EXAMPLE.COM  '
            const sanitized = sanitizeEmail(email)

            expect(sanitized).toBe('test@example.com')
        })

        it('should remove dangerous characters', () => {
            const maliciousEmail = 'test<script>@example.com'
            const sanitized = sanitizeEmail(maliciousEmail)

            expect(sanitized).not.toContain('<script>')
        })
    })

    describe('sanitizeSqlInput', () => {
        it('should remove SQL injection patterns', () => {
            const maliciousInput = "'; DROP TABLE users; --"
            const sanitized = sanitizeSqlInput(maliciousInput)

            expect(sanitized).not.toContain('DROP')
            expect(sanitized).not.toContain('--')
        })

        it('should remove UNION attacks', () => {
            const maliciousInput = "1 UNION SELECT * FROM users"
            const sanitized = sanitizeSqlInput(maliciousInput)

            expect(sanitized).not.toContain('UNION')
            expect(sanitized).not.toContain('SELECT')
        })
    })

    describe('sanitizeObject', () => {
        it('should sanitize all string values in object', () => {
            const maliciousObject = {
                name: '<script>alert("xss")</script>John',
                email: '  TEST@EXAMPLE.COM  ',
                description: 'Safe content'
            }

            const sanitized = sanitizeObject(maliciousObject)

            expect(sanitized.name).not.toContain('<script>')
            expect(sanitized.email).toBe('TEST@EXAMPLE.COM')
            expect(sanitized.description).toBe('Safe content')
        })

        it('should handle nested objects', () => {
            const nestedObject = {
                user: {
                    name: '<script>alert("xss")</script>John',
                    profile: {
                        bio: 'Safe bio content'
                    }
                }
            }

            const sanitized = sanitizeObject(nestedObject)

            expect((sanitized.user as any).name).not.toContain('<script>')
            expect(((sanitized.user as any).profile as any).bio).toBe('Safe bio content')
        })
    })

    describe('validateAndSanitizeFile', () => {
        it('should validate file type and size', () => {
            const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

            const result = validateAndSanitizeFile(mockFile, {
                allowedTypes: ['text/plain'],
                maxSize: 1000,
                allowedExtensions: ['txt']
            })

            expect(result.isValid).toBe(true)
            expect(result.sanitizedName).toBe('test.txt')
        })

        it('should reject invalid file types', () => {
            const mockFile = new File(['content'], 'malware.exe', { type: 'application/x-executable' })

            const result = validateAndSanitizeFile(mockFile, {
                allowedTypes: ['text/plain'],
                maxSize: 1000,
                allowedExtensions: ['txt']
            })

            expect(result.isValid).toBe(false)
            expect(result.error).toContain('not allowed')
        })

        it('should reject oversized files', () => {
            const mockFile = new File(['x'.repeat(2000)], 'large.txt', { type: 'text/plain' })

            const result = validateAndSanitizeFile(mockFile, {
                allowedTypes: ['text/plain'],
                maxSize: 1000,
                allowedExtensions: ['txt']
            })

            expect(result.isValid).toBe(false)
            expect(result.error).toContain('exceeds maximum')
        })
    })
})

describe('Security Validation', () => {
    let validator: SecurityValidator

    beforeEach(() => {
        validator = new SecurityValidator()
    })

    describe('SQL injection detection', () => {
        it('should detect SQL injection patterns', () => {
            const maliciousInputs = [
                "'; DROP TABLE users; --",
                "1 OR 1=1",
                "UNION SELECT * FROM passwords",
                "'; EXEC xp_cmdshell('dir'); --"
            ]

            maliciousInputs.forEach(input => {
                const result = validator.validateInput(input)
                expect(result.isValid).toBe(false)
                expect(result.threats.some(t => t.includes('SQL injection'))).toBe(true)
            })
        })

        it('should allow safe SQL-like content', () => {
            const safeInputs = [
                "My favorite color is blue",
                "I have cats",
                "The combination of these sets is empty"
            ]

            safeInputs.forEach(input => {
                const result = validator.validateInput(input)
                expect(result.isValid).toBe(true)
            })
        })
    })

    describe('XSS detection', () => {
        it('should detect XSS patterns', () => {
            const maliciousInputs = [
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<img onerror="alert(1)" src="x">',
                '<iframe src="javascript:alert(1)"></iframe>'
            ]

            maliciousInputs.forEach(input => {
                const result = validator.validateInput(input)
                expect(result.isValid).toBe(false)
                expect(result.threats.some(t => t.includes('XSS'))).toBe(true)
            })
        })
    })

    describe('Path traversal detection', () => {
        it('should detect path traversal patterns', () => {
            const maliciousInputs = [
                '../../../etc/passwd',
                '..\\..\\windows\\system32',
                '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
            ]

            maliciousInputs.forEach(input => {
                const result = validator.validateInput(input)
                expect(result.isValid).toBe(false)
                expect(result.threats.some(t => t.includes('Path traversal'))).toBe(true)
            })
        })
    })

    describe('Command injection detection', () => {
        it('should detect command injection patterns', () => {
            const maliciousInputs = [
                'test; cat /etc/passwd',
                'test | whoami',
                'test && rm -rf /',
                'test `id`'
            ]

            maliciousInputs.forEach(input => {
                const result = validator.validateInput(input)
                expect(result.isValid).toBe(false)
                expect(result.threats.some(t => t.includes('Command injection'))).toBe(true)
            })
        })
    })

    describe('Object validation', () => {
        it('should validate object fields', () => {
            const testObject = {
                name: 'John Doe',
                email: 'john@example.com',
                malicious: '<script>alert("xss")</script>'
            }

            const result = validator.validateInput(testObject)
            expect(result.isValid).toBe(false)
            expect(result.errors.some(e => e.includes('malicious'))).toBe(true)
        })

        it('should sanitize valid object fields', () => {
            const validator = new SecurityValidator({
                checkXss: true,
                sanitizeInput: true
            })

            const testObject = {
                name: '  John Doe  ',
                description: 'Safe content'
            }

            const result = validator.validateInput(testObject)
            expect(result.isValid).toBe(true)
            expect(result.sanitizedData.name).toBe('John Doe')
        })
    })
})

describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
        const rateLimit = createRateLimit({
            windowMs: 60000,
            maxRequests: 5
        })

        const mockRequest = {
            headers: new Map([['x-forwarded-for', '192.168.1.1']]),
            ip: '192.168.1.1'
        } as any as NextRequest

        // First request should be allowed
        const result = await rateLimit(mockRequest)
        expect(result).toBeNull()
    })

    it('should block requests exceeding limit', async () => {
        const rateLimit = createRateLimit({
            windowMs: 60000,
            maxRequests: 2
        })

        const mockRequest = {
            headers: new Map([['x-forwarded-for', '192.168.1.2']]),
            ip: '192.168.1.2'
        } as any as NextRequest

        // First two requests should be allowed
        await rateLimit(mockRequest)
        await rateLimit(mockRequest)

        // Third request should be blocked
        const result = await rateLimit(mockRequest)
        expect(result).not.toBeNull()
        expect(result?.status).toBe(429)
    })

    it('should use correct rate limit configs', () => {
        expect(RATE_LIMIT_CONFIGS.auth.maxRequests).toBe(5)
        expect(RATE_LIMIT_CONFIGS.auth.windowMs).toBe(15 * 60 * 1000)

        expect(RATE_LIMIT_CONFIGS.api.maxRequests).toBe(100)
        expect(RATE_LIMIT_CONFIGS.passwordReset.maxRequests).toBe(3)
    })
})

describe('Security Integration', () => {
    it('should handle multiple security threats in single input', () => {
        const validator = new SecurityValidator()
        const maliciousInput = "'; DROP TABLE users; --<script>alert('xss')</script>../../../etc/passwd"

        const result = validator.validateInput(maliciousInput)

        expect(result.isValid).toBe(false)
        expect(result.threats.length).toBeGreaterThan(1)
        expect(result.threats.some(t => t.includes('SQL injection'))).toBe(true)
        expect(result.threats.some(t => t.includes('XSS'))).toBe(true)
        expect(result.threats.some(t => t.includes('Path traversal'))).toBe(true)
    })

    it('should sanitize input while preserving safe content', () => {
        const validator = new SecurityValidator({ sanitizeInput: true })
        const mixedInput = "Hello World <script>alert('xss')</script> Safe Content"

        const result = validator.validateInput(mixedInput)

        expect(result.sanitizedData).toContain('Hello World')
        expect(result.sanitizedData).toContain('Safe Content')
        expect(result.sanitizedData).not.toContain('<script>')
    })
})

describe('Error Handling', () => {
    it('should handle encryption errors gracefully', () => {
        expect(() => encryptData('')).not.toThrow()
        expect(() => decryptData('')).toThrow()
    })

    it('should handle validation errors gracefully', () => {
        const validator = new SecurityValidator()

        expect(() => validator.validateInput(null)).not.toThrow()
        expect(() => validator.validateInput(undefined)).not.toThrow()
        expect(() => validator.validateInput(123)).not.toThrow()
    })

    it('should handle sanitization errors gracefully', () => {
        expect(() => sanitizeText(null as any)).not.toThrow()
        expect(() => sanitizeHtml(undefined as any)).not.toThrow()
        expect(() => sanitizeObject(null as any)).not.toThrow()
    })
})