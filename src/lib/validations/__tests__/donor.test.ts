import { describe, it, expect, beforeEach } from 'vitest'
import {
    donorProfileSchema,
    medicalHistorySchema,
    registrationStep1Schema,
    registrationStep2Schema,
    registrationStep3Schema,
    registrationStep4Schema,
    updateDonorProfileSchema,
    eligibilitySchema,
    medicalConditionSchema,
    updateMedicalHistorySchema,
    updatePreferencesSchema
} from '../donor'

describe('Donor Profile Validation', () => {
    let validProfile: Record<string, unknown>
    let validMedicalHistory: Record<string, unknown>

    beforeEach(() => {
        validProfile = {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            bloodType: 'O+' as const,
            phone: '1234567890',
            address: {
                street: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                zipCode: '12345',
                country: 'USA'
            },
            emergencyContact: {
                name: 'Jane Doe',
                relationship: 'Spouse',
                phone: '0987654321'
            }
        }

        validMedicalHistory = {
            hasChronicConditions: false,
            lifestyle: {
                smoker: false,
                alcoholConsumption: 'none' as const,
                recentTattoos: false,
                recentPiercings: false
            }
        }
    })

    describe('donorProfileSchema', () => {
        it('should validate a complete donor profile', () => {
            const result = donorProfileSchema.safeParse(validProfile)
            expect(result.success).toBe(true)
        })

        it('should validate profile with optional medical history', () => {
            const profileWithMedicalHistory = {
                ...validProfile,
                medicalHistory: validMedicalHistory
            }

            const result = donorProfileSchema.safeParse(profileWithMedicalHistory)
            expect(result.success).toBe(true)
        })

        it('should validate profile with preferences', () => {
            const profileWithPreferences = {
                ...validProfile,
                preferences: {
                    notifications: {
                        email: true,
                        sms: false,
                        push: true
                    },
                    scheduling: {
                        preferredDays: ['monday', 'tuesday'],
                        preferredTimes: ['morning'],
                        maxTravelDistance: 25
                    }
                }
            }

            const result = donorProfileSchema.safeParse(profileWithPreferences)
            expect(result.success).toBe(true)
        })

        it('should reject invalid blood type', () => {
            const invalidProfile = {
                ...validProfile,
                bloodType: 'X+'
            }

            const result = donorProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
        })

        it('should reject age under 16', () => {
            const currentYear = new Date().getFullYear()
            const invalidProfile = {
                ...validProfile,
                dateOfBirth: `${currentYear - 15}-01-01` // 15 years old
            }

            const result = donorProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
        })

        it('should reject age over 100', () => {
            const currentYear = new Date().getFullYear()
            const invalidProfile = {
                ...validProfile,
                dateOfBirth: `${currentYear - 101}-01-01` // 101 years old
            }

            const result = donorProfileSchema.safeParse(invalidProfile)
            expect(result.success).toBe(false)
        })

        it('should require all mandatory fields', () => {
            const incompleteProfile = {
                firstName: 'John',
                // Missing lastName, dateOfBirth, bloodType, phone, address, emergencyContact
            }

            const result = donorProfileSchema.safeParse(incompleteProfile)
            expect(result.success).toBe(false)
        })

        it('should validate phone number length', () => {
            const shortPhoneProfile = {
                ...validProfile,
                phone: '123' // Too short
            }

            const result = donorProfileSchema.safeParse(shortPhoneProfile)
            expect(result.success).toBe(false)
        })

        it('should validate name length limits', () => {
            const longNameProfile = {
                ...validProfile,
                firstName: 'A'.repeat(101) // Too long
            }

            const result = donorProfileSchema.safeParse(longNameProfile)
            expect(result.success).toBe(false)
        })

        it('should validate address structure', () => {
            const invalidAddressProfile = {
                ...validProfile,
                address: {
                    street: '123 Main St',
                    // Missing required city, state, zipCode
                }
            }

            const result = donorProfileSchema.safeParse(invalidAddressProfile)
            expect(result.success).toBe(false)
        })

        it('should validate emergency contact structure', () => {
            const invalidEmergencyContactProfile = {
                ...validProfile,
                emergencyContact: {
                    name: 'Jane Doe',
                    // Missing required relationship and phone
                }
            }

            const result = donorProfileSchema.safeParse(invalidEmergencyContactProfile)
            expect(result.success).toBe(false)
        })
    })

    describe('medicalConditionSchema', () => {
        it('should validate medical condition with all fields', () => {
            const validCondition = {
                condition: 'Diabetes',
                diagnosed: '2020-01-01',
                medications: ['Metformin'],
                notes: 'Well controlled'
            }

            const result = medicalConditionSchema.safeParse(validCondition)
            expect(result.success).toBe(true)
        })

        it('should require condition field', () => {
            const invalidCondition = {
                diagnosed: '2020-01-01',
                medications: ['Metformin']
            }

            const result = medicalConditionSchema.safeParse(invalidCondition)
            expect(result.success).toBe(false)
        })

        it('should allow optional fields to be missing', () => {
            const minimalCondition = {
                condition: 'Diabetes'
            }

            const result = medicalConditionSchema.safeParse(minimalCondition)
            expect(result.success).toBe(true)
        })
    })

    describe('medicalHistorySchema', () => {
        it('should validate medical history with chronic conditions', () => {
            const validMedicalHistory = {
                hasChronicConditions: true,
                chronicConditions: [
                    {
                        condition: 'Diabetes',
                        diagnosed: '2020-01-01',
                        medications: ['Metformin'],
                        notes: 'Well controlled'
                    }
                ],
                currentMedications: ['Metformin'],
                allergies: ['Penicillin'],
                lifestyle: {
                    smoker: false,
                    alcoholConsumption: 'occasional' as const,
                    recentTattoos: false,
                    recentPiercings: false
                }
            }

            const result = medicalHistorySchema.safeParse(validMedicalHistory)
            expect(result.success).toBe(true)
        })

        it('should validate medical history without chronic conditions', () => {
            const validMedicalHistory = {
                hasChronicConditions: false,
                lifestyle: {
                    smoker: false,
                    alcoholConsumption: 'none' as const,
                    recentTattoos: false,
                    recentPiercings: false
                }
            }

            const result = medicalHistorySchema.safeParse(validMedicalHistory)
            expect(result.success).toBe(true)
        })

        it('should validate pregnancy information', () => {
            const validMedicalHistory = {
                hasChronicConditions: false,
                pregnancies: {
                    hasBeenPregnant: true,
                    numberOfPregnancies: 2,
                    lastPregnancyDate: '2022-01-01'
                }
            }

            const result = medicalHistorySchema.safeParse(validMedicalHistory)
            expect(result.success).toBe(true)
        })

        it('should validate recent travel information', () => {
            const validMedicalHistory = {
                hasChronicConditions: false,
                lifestyle: {
                    smoker: false,
                    alcoholConsumption: 'none' as const,
                    recentTattoos: false,
                    recentPiercings: false,
                    recentTravel: [
                        {
                            country: 'Mexico',
                            dateFrom: '2023-01-01',
                            dateTo: '2023-01-15'
                        }
                    ]
                }
            }

            const result = medicalHistorySchema.safeParse(validMedicalHistory)
            expect(result.success).toBe(true)
        })
    })

    describe('registrationStep1Schema', () => {
        it('should validate step 1 registration data', () => {
            const validStep1 = {
                email: 'john@example.com',
                password: 'Password123',
                confirmPassword: 'Password123'
            }

            const result = registrationStep1Schema.safeParse(validStep1)
            expect(result.success).toBe(true)
        })

        it('should reject mismatched passwords', () => {
            const invalidStep1 = {
                email: 'john@example.com',
                password: 'Password123',
                confirmPassword: 'DifferentPassword123'
            }

            const result = registrationStep1Schema.safeParse(invalidStep1)
            expect(result.success).toBe(false)
        })

        it('should reject weak passwords', () => {
            const invalidStep1 = {
                email: 'john@example.com',
                password: 'weak',
                confirmPassword: 'weak'
            }

            const result = registrationStep1Schema.safeParse(invalidStep1)
            expect(result.success).toBe(false)
        })

        it('should reject invalid email', () => {
            const invalidStep1 = {
                email: 'invalid-email',
                password: 'Password123',
                confirmPassword: 'Password123'
            }

            const result = registrationStep1Schema.safeParse(invalidStep1)
            expect(result.success).toBe(false)
        })
    })

    describe('registrationStep2Schema', () => {
        it('should validate step 2 registration data', () => {
            const validStep2 = {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                bloodType: 'O+' as const,
                phone: '1234567890'
            }

            const result = registrationStep2Schema.safeParse(validStep2)
            expect(result.success).toBe(true)
        })

        it('should reject invalid blood type', () => {
            const invalidStep2 = {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                bloodType: 'Invalid',
                phone: '1234567890'
            }

            const result = registrationStep2Schema.safeParse(invalidStep2)
            expect(result.success).toBe(false)
        })
    })

    describe('registrationStep3Schema', () => {
        it('should validate step 3 registration data', () => {
            const validStep3 = {
                address: {
                    street: '123 Main St',
                    city: 'Anytown',
                    state: 'CA',
                    zipCode: '12345',
                    country: 'USA'
                },
                emergencyContact: {
                    name: 'Jane Doe',
                    relationship: 'Spouse',
                    phone: '0987654321'
                }
            }

            const result = registrationStep3Schema.safeParse(validStep3)
            expect(result.success).toBe(true)
        })

        it('should require all address fields', () => {
            const invalidStep3 = {
                address: {
                    street: '123 Main St',
                    // Missing city, state, zipCode
                },
                emergencyContact: {
                    name: 'Jane Doe',
                    relationship: 'Spouse',
                    phone: '0987654321'
                }
            }

            const result = registrationStep3Schema.safeParse(invalidStep3)
            expect(result.success).toBe(false)
        })
    })

    describe('registrationStep4Schema', () => {
        it('should validate step 4 registration data', () => {
            const validStep4 = {
                medicalHistory: {
                    hasChronicConditions: false,
                    lifestyle: {
                        smoker: false,
                        alcoholConsumption: 'none' as const,
                        recentTattoos: false,
                        recentPiercings: false
                    }
                },
                preferences: {
                    notifications: {
                        email: true,
                        sms: false,
                        push: true
                    },
                    scheduling: {
                        preferredDays: ['monday', 'tuesday'],
                        preferredTimes: ['morning'],
                        maxTravelDistance: 25
                    }
                }
            }

            const result = registrationStep4Schema.safeParse(validStep4)
            expect(result.success).toBe(true)
        })
    })

    describe('updateDonorProfileSchema', () => {
        it('should validate partial profile updates', () => {
            const validUpdate = {
                firstName: 'John',
                phone: '1234567890'
                // Other fields are optional for updates
            }

            const result = updateDonorProfileSchema.safeParse(validUpdate)
            expect(result.success).toBe(true)
        })

        it('should allow empty updates', () => {
            const emptyUpdate = {}

            const result = updateDonorProfileSchema.safeParse(emptyUpdate)
            expect(result.success).toBe(true)
        })

        it('should validate updated fields', () => {
            const invalidUpdate = {
                bloodType: 'Invalid'
            }

            const result = updateDonorProfileSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(false)
        })
    })

    describe('eligibilitySchema', () => {
        it('should validate eligibility data', () => {
            const validEligibility = {
                age: 25,
                weight: 150,
                lastDonationDate: '2023-01-01',
                isEligible: true,
                eligibilityReasons: ['Age requirement met', 'Weight requirement met'],
                nextEligibleDate: '2023-03-01'
            }

            const result = eligibilitySchema.safeParse(validEligibility)
            expect(result.success).toBe(true)
        })

        it('should reject age under 16', () => {
            const invalidEligibility = {
                age: 15,
                isEligible: false,
                eligibilityReasons: ['Too young']
            }

            const result = eligibilitySchema.safeParse(invalidEligibility)
            expect(result.success).toBe(false)
        })

        it('should reject weight under 110 pounds', () => {
            const invalidEligibility = {
                age: 25,
                weight: 100,
                isEligible: false,
                eligibilityReasons: ['Weight too low']
            }

            const result = eligibilitySchema.safeParse(invalidEligibility)
            expect(result.success).toBe(false)
        })
    })

    describe('updateMedicalHistorySchema', () => {
        it('should validate partial medical history updates', () => {
            const validUpdate = {
                hasChronicConditions: true,
                lifestyle: {
                    smoker: true
                }
            }

            const result = updateMedicalHistorySchema.safeParse(validUpdate)
            expect(result.success).toBe(true)
        })

        it('should allow empty updates', () => {
            const emptyUpdate = {}

            const result = updateMedicalHistorySchema.safeParse(emptyUpdate)
            expect(result.success).toBe(true)
        })
    })

    describe('updatePreferencesSchema', () => {
        it('should validate partial preference updates', () => {
            const validUpdate = {
                notifications: {
                    email: false
                },
                scheduling: {
                    maxTravelDistance: 50
                }
            }

            const result = updatePreferencesSchema.safeParse(validUpdate)
            expect(result.success).toBe(true)
        })

        it('should allow empty preference updates', () => {
            const emptyUpdate = {}

            const result = updatePreferencesSchema.safeParse(emptyUpdate)
            expect(result.success).toBe(true)
        })

        it('should validate travel distance limits', () => {
            const invalidUpdate = {
                scheduling: {
                    maxTravelDistance: 150 // Too high
                }
            }

            const result = updatePreferencesSchema.safeParse(invalidUpdate)
            expect(result.success).toBe(false)
        })
    })

    describe('edge cases and complex scenarios', () => {
        it('should handle complex profile with all optional fields', () => {
            const complexProfile = {
                ...validProfile,
                medicalHistory: {
                    hasChronicConditions: true,
                    chronicConditions: [
                        {
                            condition: 'Diabetes Type 2',
                            diagnosed: '2020-01-01',
                            medications: ['Metformin', 'Insulin'],
                            notes: 'Well controlled with medication'
                        }
                    ],
                    currentMedications: ['Metformin', 'Insulin', 'Lisinopril'],
                    allergies: ['Penicillin', 'Shellfish'],
                    surgeries: [
                        {
                            procedure: 'Appendectomy',
                            date: '2018-05-15',
                            notes: 'No complications'
                        }
                    ],
                    bloodTransfusions: [
                        {
                            date: '2019-03-10',
                            reason: 'Surgery',
                            location: 'General Hospital'
                        }
                    ],
                    pregnancies: {
                        hasBeenPregnant: true,
                        numberOfPregnancies: 2,
                        lastPregnancyDate: '2021-08-15'
                    },
                    lifestyle: {
                        smoker: false,
                        alcoholConsumption: 'occasional',
                        recentTattoos: false,
                        recentPiercings: false,
                        recentTravel: [
                            {
                                country: 'Mexico',
                                dateFrom: '2023-01-01',
                                dateTo: '2023-01-15'
                            }
                        ]
                    }
                },
                preferences: {
                    notifications: {
                        email: true,
                        sms: true,
                        push: false
                    },
                    scheduling: {
                        preferredDays: ['monday', 'wednesday', 'friday'],
                        preferredTimes: ['morning', 'afternoon'],
                        maxTravelDistance: 30
                    },
                    privacy: {
                        shareDataForResearch: true,
                        allowPublicRecognition: false
                    }
                }
            }

            const result = donorProfileSchema.safeParse(complexProfile)
            expect(result.success).toBe(true)
        })

        it('should validate registration step schemas work together', () => {
            const step1 = {
                email: 'test@example.com',
                password: 'Password123',
                confirmPassword: 'Password123'
            }

            const step2 = {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1990-01-01',
                bloodType: 'O+' as const,
                phone: '1234567890'
            }

            const step3 = {
                address: validProfile.address,
                emergencyContact: validProfile.emergencyContact
            }

            const step4 = {
                medicalHistory: validMedicalHistory,
                preferences: {
                    notifications: {
                        email: true,
                        sms: false,
                        push: true
                    }
                }
            }

            expect(registrationStep1Schema.safeParse(step1).success).toBe(true)
            expect(registrationStep2Schema.safeParse(step2).success).toBe(true)
            expect(registrationStep3Schema.safeParse(step3).success).toBe(true)
            expect(registrationStep4Schema.safeParse(step4).success).toBe(true)
        })

        it('should handle boundary age values correctly', () => {
            const currentYear = new Date().getFullYear()

            // Exactly 16 years old
            const sixteenYearOld = {
                ...validProfile,
                dateOfBirth: `${currentYear - 16}-01-01`
            }
            expect(donorProfileSchema.safeParse(sixteenYearOld).success).toBe(true)

            // Exactly 100 years old
            const hundredYearOld = {
                ...validProfile,
                dateOfBirth: `${currentYear - 100}-01-01`
            }
            expect(donorProfileSchema.safeParse(hundredYearOld).success).toBe(true)
        })
    })
})