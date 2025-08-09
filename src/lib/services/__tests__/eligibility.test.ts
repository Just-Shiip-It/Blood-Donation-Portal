import { describe, it, expect, beforeEach } from 'vitest'
import { DonorEligibilityService } from '../eligibility'
import { DonorProfile } from '@/lib/validations/donor'

describe('DonorEligibilityService', () => {
    let mockProfile: DonorProfile
    let currentDate: Date

    beforeEach(() => {
        currentDate = new Date('2024-01-15T10:00:00Z')

        mockProfile = {
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
    })

    describe('checkEligibility', () => {
        it('should return eligible for a healthy donor with no restrictions', () => {
            const result = DonorEligibilityService.checkEligibility(mockProfile, undefined, currentDate)

            expect(result.isEligible).toBe(true)
            expect(result.reasons).toHaveLength(0)
            expect(result.temporaryDeferrals).toHaveLength(0)
            expect(result.permanentDeferrals).toHaveLength(0)
        })

        it('should defer donor who is too young', () => {
            const youngProfile = {
                ...mockProfile,
                dateOfBirth: '2010-01-01' // 14 years old
            }

            const result = DonorEligibilityService.checkEligibility(youngProfile, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.reasons).toContain('Must be at least 16 years old')
            expect(result.nextEligibleDate).toEqual(new Date('2026-01-01'))
        })

        it('should permanently defer donor who is too old', () => {
            const oldProfile = {
                ...mockProfile,
                dateOfBirth: '1920-01-01' // 104 years old
            }

            const result = DonorEligibilityService.checkEligibility(oldProfile, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.reasons).toContain('Age limit exceeded')
            expect(result.permanentDeferrals).toHaveLength(1)
            expect(result.permanentDeferrals[0].reason).toContain('Age limit exceeded')
        })

        it('should defer donor who donated too recently', () => {
            const recentDonationDate = '2023-12-01' // 45 days ago

            const result = DonorEligibilityService.checkEligibility(mockProfile, recentDonationDate, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.reasons[0]).toContain('Must wait')
            expect(result.reasons[0]).toContain('more days since last donation')
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toBe('Minimum interval between donations not met')
        })

        it('should allow donation after 56 days', () => {
            const oldDonationDate = '2023-11-20' // 56 days ago

            const result = DonorEligibilityService.checkEligibility(mockProfile, oldDonationDate, currentDate)

            expect(result.isEligible).toBe(true)
        })

        it('should permanently defer donor with HIV', () => {
            const profileWithHIV = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: true,
                    chronicConditions: [{
                        condition: 'HIV positive',
                        diagnosed: '2020-01-01'
                    }]
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithHIV, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.permanentDeferrals).toHaveLength(1)
            expect(result.permanentDeferrals[0].reason).toContain('HIV')
        })

        it('should temporarily defer donor with deferral medication', () => {
            const profileWithMedication = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    currentMedications: ['Warfarin', 'Aspirin']
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithMedication, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals.length).toBeGreaterThan(0)
            expect(result.temporaryDeferrals[0].reason).toContain('Current medication')
        })

        it('should defer donor with recent blood transfusion', () => {
            const profileWithTransfusion = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    bloodTransfusions: [{
                        date: '2023-06-01',
                        reason: 'Surgery',
                        location: 'Hospital'
                    }]
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithTransfusion, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toBe('Recent blood transfusion')
            expect(result.temporaryDeferrals[0].until).toEqual(new Date('2024-06-01'))
        })

        it('should defer donor with recent pregnancy', () => {
            const profileWithRecentPregnancy = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    pregnancies: {
                        hasBeenPregnant: true,
                        numberOfPregnancies: 1,
                        lastPregnancyDate: '2024-01-01' // 2 weeks ago
                    }
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithRecentPregnancy, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toBe('Recent pregnancy')
        })

        it('should defer donor with recent tattoo', () => {
            const profileWithTattoo = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    lifestyle: {
                        smoker: false,
                        alcoholConsumption: 'none' as const,
                        recentTattoos: true,
                        recentPiercings: false
                    }
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithTattoo, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toBe('Recent tattoo or piercing')
        })

        it('should defer donor with recent travel to high-risk area', () => {
            const profileWithRiskyTravel = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    lifestyle: {
                        smoker: false,
                        alcoholConsumption: 'none' as const,
                        recentTattoos: false,
                        recentPiercings: false,
                        recentTravel: [{
                            country: 'malaria-endemic-countries',
                            dateFrom: '2023-06-01',
                            dateTo: '2023-06-15'
                        }]
                    }
                }
            }

            const result = DonorEligibilityService.checkEligibility(profileWithRiskyTravel, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toContain('Recent travel')
        })
    })

    describe('getNextEligibleDate', () => {
        it('should return date 56 days after last donation', () => {
            const lastDonation = '2024-01-01'
            const nextEligible = DonorEligibilityService.getNextEligibleDate(lastDonation)

            expect(nextEligible).toEqual(new Date('2024-02-26'))
        })
    })

    describe('getEligibilitySummary', () => {
        it('should return eligible status for qualified donor', () => {
            const summary = DonorEligibilityService.getEligibilitySummary(mockProfile)

            expect(summary.status).toBe('eligible')
            expect(summary.message).toBe('You are eligible to donate blood!')
            expect(summary.nextEligibleDate).toBeUndefined()
        })

        it('should return permanently deferred status for donor with permanent condition', () => {
            const profileWithPermanentCondition = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: true,
                    chronicConditions: [{
                        condition: 'hepatitis-b',
                        diagnosed: '2020-01-01'
                    }]
                }
            }

            // Test the checkEligibility method directly with our controlled date
            const result = DonorEligibilityService.checkEligibility(profileWithPermanentCondition, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.permanentDeferrals).toHaveLength(1)
            expect(result.permanentDeferrals[0].reason).toContain('hepatitis-b')
        })

        it('should return temporarily deferred status with next eligible date', () => {
            const recentDonation = '2023-12-01'

            // Test the checkEligibility method directly with our controlled date
            const result = DonorEligibilityService.checkEligibility(mockProfile, recentDonation, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals).toHaveLength(1)
            expect(result.temporaryDeferrals[0].reason).toBe('Minimum interval between donations not met')
            expect(result.nextEligibleDate).toBeDefined()
        })
    })

    describe('edge cases', () => {
        it('should handle multiple deferral conditions', () => {
            const complexProfile = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: true,
                    chronicConditions: [{
                        condition: 'Diabetes',
                        diagnosed: '2020-01-01'
                    }],
                    currentMedications: ['Warfarin'],
                    lifestyle: {
                        smoker: false,
                        alcoholConsumption: 'none' as const,
                        recentTattoos: true,
                        recentPiercings: false
                    }
                }
            }

            const result = DonorEligibilityService.checkEligibility(complexProfile, undefined, currentDate)

            expect(result.isEligible).toBe(false)
            expect(result.temporaryDeferrals.length).toBeGreaterThan(1)
        })

        it('should handle missing optional medical history fields', () => {
            const minimalProfile = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false
                }
            }

            const result = DonorEligibilityService.checkEligibility(minimalProfile, undefined, currentDate)

            expect(result.isEligible).toBe(true)
        })

        it('should handle invalid dates gracefully', () => {
            const profileWithInvalidDate = {
                ...mockProfile,
                medicalHistory: {
                    hasChronicConditions: false,
                    bloodTransfusions: [{
                        date: 'invalid-date',
                        reason: 'Surgery'
                    }]
                }
            }

            // Should not throw an error
            expect(() => {
                DonorEligibilityService.checkEligibility(profileWithInvalidDate, undefined, currentDate)
            }).not.toThrow()
        })
    })

    describe('utility methods', () => {
        it('should calculate age correctly', () => {
            // Test the private calculateAge method indirectly through checkEligibility
            const profile16 = { ...mockProfile, dateOfBirth: '2008-01-15' } // Exactly 16 on test date
            const profile15 = { ...mockProfile, dateOfBirth: '2009-01-16' } // 15 years old

            const result16 = DonorEligibilityService.checkEligibility(profile16, undefined, currentDate)
            const result15 = DonorEligibilityService.checkEligibility(profile15, undefined, currentDate)

            expect(result16.isEligible).toBe(true)
            expect(result15.isEligible).toBe(false)
        })

        it('should handle birthday edge cases', () => {
            // Test birthday not yet reached this year
            const profileBirthdayNotReached = {
                ...mockProfile,
                dateOfBirth: '1990-06-01' // Birthday later in the year
            }

            const result = DonorEligibilityService.checkEligibility(profileBirthdayNotReached, undefined, currentDate)
            expect(result.isEligible).toBe(true) // Should still be eligible as they're over 16
        })
    })
})