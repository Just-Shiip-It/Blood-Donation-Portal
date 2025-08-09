import { DonorProfile, MedicalHistory } from '@/lib/validations/donor'

// Eligibility constants
const MINIMUM_AGE = 16
const MAXIMUM_AGE = 100

const DONATION_INTERVAL_DAYS = 56 // 8 weeks between whole blood donations
const PREGNANCY_DEFERRAL_WEEKS = 6
const TATTOO_PIERCING_DEFERRAL_MONTHS = 3
const TRAVEL_DEFERRAL_COUNTRIES = [
    'malaria-endemic-countries', // This would be expanded with actual country codes
]

// Permanent deferral conditions
const PERMANENT_DEFERRAL_CONDITIONS = [
    'hiv',
    'hepatitis-b',
    'hepatitis-c',
    'variant-creutzfeldt-jakob-disease',
    'babesiosis',
    'chagas-disease',
    'leishmaniasis'
]

// Temporary deferral medications (simplified list)
const DEFERRAL_MEDICATIONS = [
    'isotretinoin',
    'finasteride',
    'dutasteride',
    'warfarin',
    'heparin',
    'aspirin' // context-dependent
]

interface EligibilityCheckResult {
    isEligible: boolean
    reasons: string[]
    nextEligibleDate?: Date
    temporaryDeferrals: Array<{
        reason: string
        until: Date
        notes?: string
    }>
    permanentDeferrals: Array<{
        reason: string
        notes?: string
    }>
}

export class DonorEligibilityService {
    /**
     * Check donor eligibility based on profile and medical history
     */
    static checkEligibility(
        profile: DonorProfile,
        lastDonationDate?: string,
        currentDate: Date = new Date()
    ): EligibilityCheckResult {
        const result: EligibilityCheckResult = {
            isEligible: true,
            reasons: [],
            temporaryDeferrals: [],
            permanentDeferrals: []
        }

        // Check age eligibility
        const age = this.calculateAge(profile.dateOfBirth, currentDate)
        if (age < MINIMUM_AGE) {
            result.isEligible = false
            result.reasons.push(`Must be at least ${MINIMUM_AGE} years old`)
            const eligibleDate = new Date(profile.dateOfBirth)
            eligibleDate.setFullYear(eligibleDate.getFullYear() + MINIMUM_AGE)
            result.nextEligibleDate = eligibleDate
        } else if (age > MAXIMUM_AGE) {
            result.isEligible = false
            result.permanentDeferrals.push({
                reason: `Age limit exceeded (maximum ${MAXIMUM_AGE} years)`,
                notes: 'Permanent deferral due to age restrictions'
            })
            result.reasons.push('Age limit exceeded')
        }

        // Check donation interval
        if (lastDonationDate) {
            const daysSinceLastDonation = this.daysBetween(new Date(lastDonationDate), currentDate)
            if (daysSinceLastDonation < DONATION_INTERVAL_DAYS) {
                result.isEligible = false
                const nextEligibleDate = new Date(lastDonationDate)
                nextEligibleDate.setDate(nextEligibleDate.getDate() + DONATION_INTERVAL_DAYS)
                result.nextEligibleDate = nextEligibleDate
                result.temporaryDeferrals.push({
                    reason: 'Minimum interval between donations not met',
                    until: nextEligibleDate,
                    notes: `Must wait ${DONATION_INTERVAL_DAYS} days between whole blood donations`
                })
                result.reasons.push(`Must wait ${DONATION_INTERVAL_DAYS - daysSinceLastDonation} more days since last donation`)
            }
        }

        // Check medical history if available
        if (profile.medicalHistory) {
            this.checkMedicalEligibility(profile.medicalHistory, result, currentDate)
        }

        return result
    }

    /**
     * Check medical history for eligibility issues
     */
    private static checkMedicalEligibility(
        medicalHistory: MedicalHistory,
        result: EligibilityCheckResult,
        currentDate: Date
    ): void {
        // Check chronic conditions
        if (medicalHistory.hasChronicConditions && medicalHistory.chronicConditions) {
            for (const condition of medicalHistory.chronicConditions) {
                const conditionLower = condition.condition.toLowerCase()

                if (PERMANENT_DEFERRAL_CONDITIONS.some(pdc => conditionLower.includes(pdc))) {
                    result.isEligible = false
                    result.permanentDeferrals.push({
                        reason: `Medical condition: ${condition.condition}`,
                        notes: condition.notes
                    })
                    result.reasons.push(`Medical condition: ${condition.condition}`)
                }
            }
        }

        // Check current medications
        if (medicalHistory.currentMedications) {
            for (const medication of medicalHistory.currentMedications) {
                const medicationLower = medication.toLowerCase()

                if (DEFERRAL_MEDICATIONS.some(dm => medicationLower.includes(dm))) {
                    result.isEligible = false
                    result.temporaryDeferrals.push({
                        reason: `Current medication: ${medication}`,
                        until: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        notes: 'Consult with medical staff about medication deferral period'
                    })
                    result.reasons.push(`Current medication may affect eligibility: ${medication}`)
                }
            }
        }

        // Check recent blood transfusions
        if (medicalHistory.bloodTransfusions && medicalHistory.bloodTransfusions.length > 0) {
            const recentTransfusion = medicalHistory.bloodTransfusions.find(bt => {
                if (!bt.date) return false
                const transfusionDate = new Date(bt.date)
                const monthsSince = this.monthsBetween(transfusionDate, currentDate)
                return monthsSince < 12
            })

            if (recentTransfusion) {
                result.isEligible = false
                const deferralUntil = new Date(recentTransfusion.date!)
                deferralUntil.setFullYear(deferralUntil.getFullYear() + 1)
                result.temporaryDeferrals.push({
                    reason: 'Recent blood transfusion',
                    until: deferralUntil,
                    notes: 'Must wait 12 months after blood transfusion'
                })
                result.reasons.push('Recent blood transfusion - must wait 12 months')
            }
        }

        // Check pregnancy status
        if (medicalHistory.pregnancies?.hasBeenPregnant && medicalHistory.pregnancies.lastPregnancyDate) {
            const lastPregnancyDate = new Date(medicalHistory.pregnancies.lastPregnancyDate)
            const weeksSince = this.weeksBetween(lastPregnancyDate, currentDate)

            if (weeksSince < PREGNANCY_DEFERRAL_WEEKS) {
                result.isEligible = false
                const deferralUntil = new Date(lastPregnancyDate)
                deferralUntil.setDate(deferralUntil.getDate() + (PREGNANCY_DEFERRAL_WEEKS * 7))
                result.temporaryDeferrals.push({
                    reason: 'Recent pregnancy',
                    until: deferralUntil,
                    notes: `Must wait ${PREGNANCY_DEFERRAL_WEEKS} weeks after pregnancy`
                })
                result.reasons.push(`Recent pregnancy - must wait ${PREGNANCY_DEFERRAL_WEEKS - weeksSince} more weeks`)
            }
        }

        // Check lifestyle factors
        if (medicalHistory.lifestyle) {
            const lifestyle = medicalHistory.lifestyle

            // Check recent tattoos/piercings
            if (lifestyle.recentTattoos || lifestyle.recentPiercings) {
                result.isEligible = false
                const deferralUntil = new Date(currentDate)
                deferralUntil.setMonth(deferralUntil.getMonth() + TATTOO_PIERCING_DEFERRAL_MONTHS)
                result.temporaryDeferrals.push({
                    reason: 'Recent tattoo or piercing',
                    until: deferralUntil,
                    notes: `Must wait ${TATTOO_PIERCING_DEFERRAL_MONTHS} months after tattoo or piercing`
                })
                result.reasons.push(`Recent tattoo/piercing - must wait ${TATTOO_PIERCING_DEFERRAL_MONTHS} months`)
            }

            // Check recent travel to high-risk areas
            if (lifestyle.recentTravel && lifestyle.recentTravel.length > 0) {
                const recentRiskyTravel = lifestyle.recentTravel.find(travel => {
                    const returnDate = new Date(travel.dateTo)
                    const monthsSince = this.monthsBetween(returnDate, currentDate)
                    return monthsSince < 12 && TRAVEL_DEFERRAL_COUNTRIES.includes(travel.country.toLowerCase())
                })

                if (recentRiskyTravel) {
                    result.isEligible = false
                    const deferralUntil = new Date(recentRiskyTravel.dateTo)
                    deferralUntil.setFullYear(deferralUntil.getFullYear() + 1)
                    result.temporaryDeferrals.push({
                        reason: `Recent travel to ${recentRiskyTravel.country}`,
                        until: deferralUntil,
                        notes: 'Travel to malaria-endemic area requires 12-month deferral'
                    })
                    result.reasons.push(`Recent travel to high-risk area: ${recentRiskyTravel.country}`)
                }
            }
        }
    }

    /**
     * Calculate age from date of birth
     */
    private static calculateAge(dateOfBirth: string, currentDate: Date = new Date()): number {
        const birthDate = new Date(dateOfBirth)
        let age = currentDate.getFullYear() - birthDate.getFullYear()
        const monthDiff = currentDate.getMonth() - birthDate.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
            age--
        }

        return age
    }

    /**
     * Calculate days between two dates
     */
    private static daysBetween(date1: Date, date2: Date): number {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime())
        return Math.ceil(timeDiff / (1000 * 3600 * 24))
    }

    /**
     * Calculate weeks between two dates
     */
    private static weeksBetween(date1: Date, date2: Date): number {
        return Math.floor(this.daysBetween(date1, date2) / 7)
    }

    /**
     * Calculate months between two dates
     */
    private static monthsBetween(date1: Date, date2: Date): number {
        const yearDiff = date2.getFullYear() - date1.getFullYear()
        const monthDiff = date2.getMonth() - date1.getMonth()
        return yearDiff * 12 + monthDiff
    }

    /**
     * Get next eligible donation date
     */
    static getNextEligibleDate(lastDonationDate: string): Date {
        const lastDonation = new Date(lastDonationDate)
        const nextEligible = new Date(lastDonation)
        nextEligible.setDate(nextEligible.getDate() + DONATION_INTERVAL_DAYS)
        return nextEligible
    }

    /**
     * Check if donor is eligible for donation today
     */
    static isEligibleToday(profile: DonorProfile, lastDonationDate?: string): boolean {
        const eligibilityResult = this.checkEligibility(profile, lastDonationDate)
        return eligibilityResult.isEligible
    }

    /**
     * Get eligibility summary for display
     */
    static getEligibilitySummary(profile: DonorProfile, lastDonationDate?: string): {
        status: 'eligible' | 'temporarily_deferred' | 'permanently_deferred'
        message: string
        nextEligibleDate?: Date
    } {
        const result = this.checkEligibility(profile, lastDonationDate)

        if (result.isEligible) {
            return {
                status: 'eligible',
                message: 'You are eligible to donate blood!'
            }
        }

        if (result.permanentDeferrals.length > 0) {
            return {
                status: 'permanently_deferred',
                message: `You are permanently deferred from donating: ${result.permanentDeferrals[0].reason}`
            }
        }

        if (result.temporaryDeferrals.length > 0) {
            const nextDate = result.temporaryDeferrals.reduce((earliest, deferral) =>
                !earliest || deferral.until < earliest ? deferral.until : earliest
                , null as Date | null)

            return {
                status: 'temporarily_deferred',
                message: `You are temporarily deferred: ${result.reasons[0]}`,
                nextEligibleDate: nextDate || undefined
            }
        }

        return {
            status: 'temporarily_deferred',
            message: 'Please consult with medical staff about your eligibility'
        }
    }
}