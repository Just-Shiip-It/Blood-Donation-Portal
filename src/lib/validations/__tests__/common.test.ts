import { describe, it, expect } from 'vitest'
import {
    bloodTypeSchema,
    phoneSchema,
    emailSchema,
    uuidSchema,
    dateSchema,
    addressSchema,
    emergencyContactSchema,
    validateBloodType,
    validateEmail,
    validatePhone
} from '../common'

describe('Common Validation Schemas', () => {
    describe('bloodTypeSchema', () => {
        it('should validate all valid blood types', () => {
            const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

            validBloodTypes.forEach(bloodType => {
                const result = bloodTypeSchema.safeParse(bloodType)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid blood types', () => {
            const invalidBloodTypes = ['X+', 'A', 'B++', 'AB', 'O', 'C+', '']

            invalidBloodTypes.forEach(bloodType => {
                const result = bloodTypeSchema.safeParse(bloodType)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('phoneSchema', () => {
        it('should validate valid phone numbers', () => {
            const validPhones = [
                '1234567890',
                '+1234567890',
                '123-456-7890',
                '(123) 456-7890',
                '+1 (123) 456-7890',
                '123 456 7890'
            ]

            validPhones.forEach(phone => {
                const result = phoneSchema.safeParse(phone)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid phone numbers', () => {
            const invalidPhones = [
                '123',
                'abc123',
                '123-45',
                '',
                '12345'
            ]

            invalidPhones.forEach(phone => {
                const result = phoneSchema.safeParse(phone)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('emailSchema', () => {
        it('should validate valid email addresses', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                'firstname.lastname@company.com'
            ]

            validEmails.forEach(email => {
                const result = emailSchema.safeParse(email)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid email addresses', () => {
            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'user@',
                'user..name@example.com',
                '',
                'user@.com'
            ]

            invalidEmails.forEach(email => {
                const result = emailSchema.safeParse(email)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('uuidSchema', () => {
        it('should validate valid UUIDs', () => {
            const validUUIDs = [
                '123e4567-e89b-12d3-a456-426614174000',
                'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
            ]

            validUUIDs.forEach(uuid => {
                const result = uuidSchema.safeParse(uuid)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid UUIDs', () => {
            const invalidUUIDs = [
                'not-a-uuid',
                '123e4567-e89b-12d3-a456',
                '123e4567-e89b-12d3-a456-426614174000-extra',
                '',
                '123'
            ]

            invalidUUIDs.forEach(uuid => {
                const result = uuidSchema.safeParse(uuid)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('dateSchema', () => {
        it('should validate valid date strings', () => {
            const validDates = [
                '2024-01-15',
                '2023-12-31',
                '1990-06-15',
                '2024-01-15T10:30:00Z',
                'January 15, 2024'
            ]

            validDates.forEach(date => {
                const result = dateSchema.safeParse(date)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid date strings', () => {
            const invalidDates = [
                'not-a-date',
                '2024-13-01', // Invalid month
                '2024-01-32', // Invalid day
                '',
                '2024/15/01' // Invalid format
            ]

            invalidDates.forEach(date => {
                const result = dateSchema.safeParse(date)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('addressSchema', () => {
        it('should validate complete address', () => {
            const validAddress = {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345',
                country: 'USA'
            }

            const result = addressSchema.safeParse(validAddress)
            expect(result.success).toBe(true)
        })

        it('should require all address fields', () => {
            const incompleteAddress = {
                street: '123 Main St',
                city: 'Anytown',
                // Missing state, zipCode, country
            }

            const result = addressSchema.safeParse(incompleteAddress)
            expect(result.success).toBe(false)
        })

        it('should reject empty address fields', () => {
            const emptyFieldAddress = {
                street: '',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345',
                country: 'USA'
            }

            const result = addressSchema.safeParse(emptyFieldAddress)
            expect(result.success).toBe(false)
        })
    })

    describe('emergencyContactSchema', () => {
        it('should validate complete emergency contact', () => {
            const validContact = {
                name: 'Jane Doe',
                relationship: 'Spouse',
                phone: '1234567890'
            }

            const result = emergencyContactSchema.safeParse(validContact)
            expect(result.success).toBe(true)
        })

        it('should require all emergency contact fields', () => {
            const incompleteContact = {
                name: 'Jane Doe',
                // Missing relationship and phone
            }

            const result = emergencyContactSchema.safeParse(incompleteContact)
            expect(result.success).toBe(false)
        })

        it('should validate phone number in emergency contact', () => {
            const invalidPhoneContact = {
                name: 'Jane Doe',
                relationship: 'Spouse',
                phone: 'invalid-phone'
            }

            const result = emergencyContactSchema.safeParse(invalidPhoneContact)
            expect(result.success).toBe(false)
        })
    })

    describe('validation helper functions', () => {
        describe('validateBloodType', () => {
            it('should return true for valid blood types', () => {
                expect(validateBloodType('A+')).toBe(true)
                expect(validateBloodType('O-')).toBe(true)
                expect(validateBloodType('AB+')).toBe(true)
            })

            it('should return false for invalid blood types', () => {
                expect(validateBloodType('X+')).toBe(false)
                expect(validateBloodType('A')).toBe(false)
                expect(validateBloodType('')).toBe(false)
            })
        })

        describe('validateEmail', () => {
            it('should return true for valid emails', () => {
                expect(validateEmail('test@example.com')).toBe(true)
                expect(validateEmail('user.name@domain.co.uk')).toBe(true)
            })

            it('should return false for invalid emails', () => {
                expect(validateEmail('invalid-email')).toBe(false)
                expect(validateEmail('@example.com')).toBe(false)
                expect(validateEmail('')).toBe(false)
            })
        })

        describe('validatePhone', () => {
            it('should return true for valid phone numbers', () => {
                expect(validatePhone('1234567890')).toBe(true)
                expect(validatePhone('+1 (123) 456-7890')).toBe(true)
            })

            it('should return false for invalid phone numbers', () => {
                expect(validatePhone('123')).toBe(false)
                expect(validatePhone('abc123')).toBe(false)
                expect(validatePhone('')).toBe(false)
            })
        })
    })
})