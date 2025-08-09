import { describe, it, expect } from 'vitest'
import {
    bloodBankProfileSchema,
    bloodBankRegistrationSchema,
    bloodInventorySchema,
    bulkInventoryUpdateSchema
} from '../blood-bank'

describe('Blood Bank Validation Schemas', () => {
    describe('bloodBankProfileSchema', () => {
        it('should validate a complete blood bank profile', () => {
            const validProfile = {
                name: 'City Blood Bank',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001',
                    country: 'US'
                },
                phone: '555-123-4567',
                email: 'contact@citybloodbank.com',
                capacity: 500,
                operatingHours: {
                    monday: { open: '08:00', close: '17:00', closed: false },
                    tuesday: { open: '08:00', close: '17:00', closed: false }
                },
                coordinates: { lat: 40.7128, lng: -74.0060 }
            }

            const result = bloodBankProfileSchema.safeParse(validProfile)
            expect(result.success).toBe(true)
        })

        it('should reject invalid email', () => {
            const invalidProfile = {
                name: 'City Blood Bank',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001'
                },
                phone: '555-123-4567',
                email: 'invalid-email',
                capacity: 500
            }

            const result = bloodBankProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['email'])
            }
        })

        it('should reject capacity outside valid range', () => {
            const invalidProfile = {
                name: 'City Blood Bank',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001'
                },
                phone: '555-123-4567',
                email: 'contact@citybloodbank.com',
                capacity: 0 // Invalid capacity
            }

            const result = bloodBankProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['capacity'])
            }
        })
    })

    describe('bloodBankRegistrationSchema', () => {
        it('should validate complete registration data', () => {
            const validRegistration = {
                email: 'admin@bloodbank.com',
                password: 'securePassword123',
                confirmPassword: 'securePassword123',
                bloodBank: {
                    name: 'City Blood Bank',
                    address: {
                        street: '123 Main St',
                        city: 'New York',
                        state: 'NY',
                        zipCode: '10001'
                    },
                    phone: '555-123-4567',
                    email: 'contact@citybloodbank.com',
                    capacity: 500
                }
            }

            const result = bloodBankRegistrationSchema.safeParse(validRegistration)
            expect(result.success).toBe(true)
        })

        it('should reject mismatched passwords', () => {
            const invalidRegistration = {
                email: 'admin@bloodbank.com',
                password: 'securePassword123',
                confirmPassword: 'differentPassword',
                bloodBank: {
                    name: 'City Blood Bank',
                    address: {
                        street: '123 Main St',
                        city: 'New York',
                        state: 'NY',
                        zipCode: '10001'
                    },
                    phone: '555-123-4567',
                    email: 'contact@citybloodbank.com',
                    capacity: 500
                }
            }

            const result = bloodBankRegistrationSchema.safeParse(invalidRegistration)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['confirmPassword'])
            }
        })
    })

    describe('bloodInventorySchema', () => {
        it('should validate valid inventory data', () => {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 30) // 30 days from now

            const validInventory = {
                bloodType: 'A+',
                unitsAvailable: 50,
                unitsReserved: 10,
                minimumThreshold: 20,
                expirationDate: futureDate.toISOString().split('T')[0] // YYYY-MM-DD format
            }

            const result = bloodInventorySchema.safeParse(validInventory)
            expect(result.success).toBe(true)
        })

        it('should reject invalid blood type', () => {
            const invalidInventory = {
                bloodType: 'X+', // Invalid blood type
                unitsAvailable: 50,
                unitsReserved: 10,
                minimumThreshold: 20
            }

            const result = bloodInventorySchema.safeParse(invalidInventory)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['bloodType'])
            }
        })

        it('should reject negative units', () => {
            const invalidInventory = {
                bloodType: 'A+',
                unitsAvailable: -5, // Negative units
                unitsReserved: 10,
                minimumThreshold: 20
            }

            const result = bloodInventorySchema.safeParse(invalidInventory)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['unitsAvailable'])
            }
        })
    })

    describe('bulkInventoryUpdateSchema', () => {
        it('should validate bulk update data', () => {
            const validBulkUpdate = {
                updates: [
                    {
                        bloodType: 'A+',
                        unitsAvailable: 50,
                        unitsReserved: 10,
                        minimumThreshold: 20
                    },
                    {
                        bloodType: 'O-',
                        unitsAvailable: 30,
                        minimumThreshold: 15
                    }
                ]
            }

            const result = bulkInventoryUpdateSchema.safeParse(validBulkUpdate)
            expect(result.success).toBe(true)
        })

        it('should reject empty updates array', () => {
            const invalidBulkUpdate = {
                updates: []
            }

            const result = bulkInventoryUpdateSchema.safeParse(invalidBulkUpdate)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['updates'])
            }
        })
    })
})