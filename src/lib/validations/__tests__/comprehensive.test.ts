import { describe, it, expect } from 'vitest'
import {
    enhancedBloodTypeSchema,
    enhancedPhoneSchema,
    enhancedEmailSchema,
    enhancedUuidSchema,
    enhancedDateSchema,
    enhancedAddressSchema,
    enhancedEmergencyContactSchema,
    userProfileSchema,
    donationRecordSchema,
    healthcareFacilitySchema,
    notificationPreferencesSchema,
    searchQuerySchema,
    auditLogSchema,
    fileUploadSchema,
    paginationSchema
} from '../comprehensive'

describe('Comprehensive Validation Schemas', () => {
    describe('enhancedBloodTypeSchema', () => {
        it('should validate all valid blood types', () => {
            const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

            validBloodTypes.forEach(bloodType => {
                const result = enhancedBloodTypeSchema.safeParse(bloodType)
                expect(result.success).toBe(true)
                if (result.success) {
                    expect(result.data).toBe(bloodType)
                }
            })
        })

        it('should reject invalid blood types with descriptive error messages', () => {
            const invalidBloodTypes = ['X+', 'A', 'B++', '']

            invalidBloodTypes.forEach(input => {
                const result = enhancedBloodTypeSchema.safeParse(input)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('enhancedPhoneSchema', () => {
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
                const result = enhancedPhoneSchema.safeParse(phone)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid phone numbers with specific error messages', () => {
            const invalidPhones = ['123', 'abc123def456', '123-45', '', '1'.repeat(25)]

            invalidPhones.forEach(input => {
                const result = enhancedPhoneSchema.safeParse(input)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('enhancedEmailSchema', () => {
        it('should validate valid email addresses', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org',
                'firstname.lastname@company.com',
                'a@b.co'
            ]

            validEmails.forEach(email => {
                const result = enhancedEmailSchema.safeParse(email)
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
                'user@.com',
                'a'.repeat(250) + '@example.com' // Too long
            ]

            invalidEmails.forEach(email => {
                const result = enhancedEmailSchema.safeParse(email)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('enhancedAddressSchema', () => {
        const validAddress = {
            street: '123 Main St',
            city: 'Anytown',
            state: 'California',
            zipCode: '12345',
            country: 'USA'
        }

        it('should validate complete valid address', () => {
            const result = enhancedAddressSchema.safeParse(validAddress)
            expect(result.success).toBe(true)
        })

        it('should require all address fields', () => {
            const requiredFields = ['street', 'city', 'state', 'zipCode', 'country']

            requiredFields.forEach(field => {
                const incompleteAddress = { ...validAddress }
                delete incompleteAddress[field as keyof typeof validAddress]

                const result = enhancedAddressSchema.safeParse(incompleteAddress)
                expect(result.success).toBe(false)
            })
        })

        it('should validate field formats', () => {
            const invalidAddresses = [
                { ...validAddress, street: 'Street with @#$%' }, // Invalid characters
                { ...validAddress, city: 'City123' }, // Numbers in city
                { ...validAddress, state: 'St@te' }, // Invalid characters in state
                { ...validAddress, zipCode: 'ABC123' }, // Letters in zip code
                { ...validAddress, country: 'Country123' } // Numbers in country
            ]

            invalidAddresses.forEach(address => {
                const result = enhancedAddressSchema.safeParse(address)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('userProfileSchema', () => {
        const validProfile = {
            email: 'user@example.com',
            role: 'donor' as const,
            isActive: true,
            emailVerified: false
        }

        it('should validate valid user profile', () => {
            const result = userProfileSchema.safeParse(validProfile)
            expect(result.success).toBe(true)
        })

        it('should validate all user roles', () => {
            const roles = ['donor', 'admin', 'facility', 'system_admin']

            roles.forEach(role => {
                const profile = { ...validProfile, role }
                const result = userProfileSchema.safeParse(profile)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid roles', () => {
            const invalidProfile = { ...validProfile, role: 'invalid_role' }
            const result = userProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
        })
    })

    describe('donationRecordSchema', () => {
        const validDonation = {
            donorId: '123e4567-e89b-12d3-a456-426614174000',
            bloodBankId: '123e4567-e89b-12d3-a456-426614174001',
            donationDate: '2024-01-15T10:30:00Z',
            bloodType: 'A+' as const,
            unitsCollected: 1.0,
            status: 'completed' as const
        }

        it('should validate valid donation record', () => {
            const result = donationRecordSchema.safeParse(validDonation)
            expect(result.success).toBe(true)
        })

        it('should validate units collected range', () => {
            const validUnits = [0.1, 0.5, 1.0, 1.5, 2.0]

            validUnits.forEach(units => {
                const donation = { ...validDonation, unitsCollected: units }
                const result = donationRecordSchema.safeParse(donation)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid units collected', () => {
            const invalidUnits = [0, -1, 2.1, 3.0]

            invalidUnits.forEach(units => {
                const donation = { ...validDonation, unitsCollected: units }
                const result = donationRecordSchema.safeParse(donation)
                expect(result.success).toBe(false)
            })
        })

        it('should validate vital signs ranges', () => {
            const donationWithVitals = {
                ...validDonation,
                hemoglobinLevel: 12.5,
                bloodPressure: { systolic: 120, diastolic: 80 },
                temperature: 98.6,
                weight: 150
            }

            const result = donationRecordSchema.safeParse(donationWithVitals)
            expect(result.success).toBe(true)
        })

        it('should reject invalid vital signs', () => {
            const invalidVitals = [
                { hemoglobinLevel: 5 }, // Too low
                { bloodPressure: { systolic: 50, diastolic: 80 } }, // Systolic too low
                { temperature: 105 }, // Too high
                { weight: 50 } // Too low
            ]

            invalidVitals.forEach(vitals => {
                const donation = { ...validDonation, ...vitals }
                const result = donationRecordSchema.safeParse(donation)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('healthcareFacilitySchema', () => {
        const validFacility = {
            name: 'General Hospital',
            type: 'hospital' as const,
            address: {
                street: '123 Hospital Ave',
                city: 'Medical City',
                state: 'California',
                zipCode: '12345',
                country: 'USA'
            },
            phone: '555-123-4567',
            email: 'contact@hospital.com',
            licenseNumber: 'LIC123456'
        }

        it('should validate valid healthcare facility', () => {
            const result = healthcareFacilitySchema.safeParse(validFacility)
            expect(result.success).toBe(true)
        })

        it('should validate all facility types', () => {
            const types = ['hospital', 'clinic', 'emergency_center', 'surgery_center', 'other']

            types.forEach(type => {
                const facility = { ...validFacility, type }
                const result = healthcareFacilitySchema.safeParse(facility)
                expect(result.success).toBe(true)
            })
        })

        it('should validate operating hours format', () => {
            const facilityWithHours = {
                ...validFacility,
                operatingHours: {
                    monday: { open: '08:00', close: '17:00', closed: false },
                    tuesday: { open: '08:00', close: '17:00', closed: false },
                    sunday: { open: '00:00', close: '00:00', closed: true }
                }
            }

            const result = healthcareFacilitySchema.safeParse(facilityWithHours)
            expect(result.success).toBe(true)
        })

        it('should reject invalid time formats', () => {
            const facilityWithInvalidHours = {
                ...validFacility,
                operatingHours: {
                    monday: { open: '25:00', close: '17:00', closed: false } // Invalid hour
                }
            }

            const result = healthcareFacilitySchema.safeParse(facilityWithInvalidHours)
            expect(result.success).toBe(false)
        })
    })

    describe('notificationPreferencesSchema', () => {
        const validPreferences = {
            email: {
                enabled: true,
                appointments: true,
                reminders: true,
                emergencyRequests: true,
                newsletters: false,
                promotions: false
            },
            sms: {
                enabled: false,
                appointments: false,
                reminders: false,
                emergencyRequests: true
            },
            push: {
                enabled: true,
                appointments: true,
                reminders: true,
                emergencyRequests: true,
                news: false
            }
        }

        it('should validate valid notification preferences', () => {
            const result = notificationPreferencesSchema.safeParse(validPreferences)
            expect(result.success).toBe(true)
        })

        it('should use default values for missing fields', () => {
            const minimalPreferences = {
                email: {},
                sms: {},
                push: {}
            }
            const result = notificationPreferencesSchema.safeParse(minimalPreferences)
            expect(result.success).toBe(true)

            if (result.success) {
                expect(result.data.email.enabled).toBe(true)
                expect(result.data.sms.enabled).toBe(false)
                expect(result.data.push.enabled).toBe(true)
            }
        })
    })

    describe('searchQuerySchema', () => {
        const validSearch = {
            query: 'blood donation',
            filters: {
                bloodType: 'A+' as const,
                location: {
                    latitude: 40.7128,
                    longitude: -74.0060,
                    radius: 25
                }
            },
            pagination: {
                page: 1,
                limit: 10
            }
        }

        it('should validate valid search query', () => {
            const result = searchQuerySchema.safeParse(validSearch)
            expect(result.success).toBe(true)
        })

        it('should reject invalid search queries', () => {
            const invalidQueries = [
                { query: '' }, // Empty query
                { query: 'a'.repeat(201) }, // Too long
                { query: 'search with @#$%' } // Invalid characters
            ]

            invalidQueries.forEach(query => {
                const result = searchQuerySchema.safeParse(query)
                expect(result.success).toBe(false)
            })
        })

        it('should validate location coordinates', () => {
            const invalidLocations = [
                { latitude: 91, longitude: 0 }, // Invalid latitude
                { latitude: 0, longitude: 181 }, // Invalid longitude
                { latitude: 0, longitude: 0, radius: 0 }, // Invalid radius
                { latitude: 0, longitude: 0, radius: 101 } // Radius too large
            ]

            invalidLocations.forEach(location => {
                const search = { ...validSearch, filters: { location } }
                const result = searchQuerySchema.safeParse(search)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('fileUploadSchema', () => {
        const validFile = {
            file: {
                name: 'document.pdf',
                size: 1024 * 1024, // 1MB
                type: 'application/pdf'
            },
            purpose: 'medical_document' as const
        }

        it('should validate valid file upload', () => {
            const result = fileUploadSchema.safeParse(validFile)
            expect(result.success).toBe(true)
        })

        it('should validate all file purposes', () => {
            const purposes = ['profile_photo', 'medical_document', 'identification', 'report']

            purposes.forEach(purpose => {
                const file = { ...validFile, purpose }
                const result = fileUploadSchema.safeParse(file)
                expect(result.success).toBe(true)
            })
        })

        it('should reject files that are too large', () => {
            const largeFile = {
                ...validFile,
                file: { ...validFile.file, size: 11 * 1024 * 1024 } // 11MB
            }

            const result = fileUploadSchema.safeParse(largeFile)
            expect(result.success).toBe(false)
        })

        it('should reject invalid file types', () => {
            const invalidFile = {
                ...validFile,
                file: { ...validFile.file, type: 'application/exe' }
            }

            const result = fileUploadSchema.safeParse(invalidFile)
            expect(result.success).toBe(false)
        })

        it('should reject files with invalid names', () => {
            const invalidNames = [
                'file with @#$.pdf',
                'a'.repeat(260) + '.pdf',
                ''
            ]

            invalidNames.forEach(name => {
                const file = {
                    ...validFile,
                    file: { ...validFile.file, name }
                }
                const result = fileUploadSchema.safeParse(file)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('paginationSchema', () => {
        it('should validate valid pagination parameters', () => {
            const validPagination = {
                page: 1,
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc' as const
            }

            const result = paginationSchema.safeParse(validPagination)
            expect(result.success).toBe(true)
        })

        it('should use default values', () => {
            const result = paginationSchema.safeParse({})
            expect(result.success).toBe(true)

            if (result.success) {
                expect(result.data.page).toBe(1)
                expect(result.data.limit).toBe(10)
                expect(result.data.sortOrder).toBe('asc')
            }
        })

        it('should reject invalid pagination parameters', () => {
            const invalidPagination = [
                { page: 0 }, // Page too low
                { page: -1 }, // Negative page
                { limit: 0 }, // Limit too low
                { limit: 101 }, // Limit too high
                { page: 1.5 }, // Non-integer page
                { limit: 10.5 } // Non-integer limit
            ]

            invalidPagination.forEach(pagination => {
                const result = paginationSchema.safeParse(pagination)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('auditLogSchema', () => {
        const validAuditLog = {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            action: 'CREATE',
            resource: 'appointment',
            resourceId: '123e4567-e89b-12d3-a456-426614174001',
            details: { field: 'value' },
            ipAddress: '192.168.1.1'
        }

        it('should validate valid audit log', () => {
            const result = auditLogSchema.safeParse(validAuditLog)
            expect(result.success).toBe(true)
        })

        it('should validate IP addresses', () => {
            const validIPs = ['192.168.1.1', '10.0.0.1', '127.0.0.1']

            validIPs.forEach(ipAddress => {
                const log = { ...validAuditLog, ipAddress }
                const result = auditLogSchema.safeParse(log)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid IP addresses', () => {
            const invalidIPs = ['999.999.999.999', 'not-an-ip', '192.168.1']

            invalidIPs.forEach(ipAddress => {
                const log = { ...validAuditLog, ipAddress }
                const result = auditLogSchema.safeParse(log)
                expect(result.success).toBe(false)
            })
        })
    })
})