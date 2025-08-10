import { db } from '@/lib/db'
import { donationHistorySchema, donorProfileSchema, bloodBankSchema, appointmentSchema } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc, count, sql } from 'drizzle-orm'
import type {
    CreateDonationRecord,
    UpdateDonationRecord,
    DonationHistoryQuery,
    DonationStatsQuery,
    HealthInsights
} from '@/lib/validations/donation-history'

export interface DonationRecord {
    id: string
    donorId: string
    bloodBankId: string
    appointmentId: string | null
    donationDate: Date
    bloodType: string
    unitsCollected: number
    healthMetrics: Record<string, unknown> | null
    notes: string | null
    createdAt: Date
    donor?: {
        firstName: string
        lastName: string
        bloodType: string
    }
    bloodBank?: {
        name: string
        address: Record<string, unknown>
    }
}

export interface DonationStats {
    totalDonations: number
    totalUnitsCollected: number
    averageUnitsPerDonation: number
    donationsByBloodType: Record<string, number>
    donationsByMonth: Array<{
        month: string
        count: number
        units: number
    }>
    healthTrends: {
        averageHemoglobin?: number
        averageBloodPressure?: {
            systolic: number
            diastolic: number
        }
        averagePulse?: number
    }
    nextEligibleDate?: string
    daysSinceLastDonation?: number
}

export interface HealthInsightData {
    donationFrequency: {
        averageDaysBetweenDonations: number
        totalDonations: number
        donationsThisYear: number
    }
    healthMetricsTrends: {
        hemoglobin: Array<{ date: string; value: number }>
        bloodPressure: Array<{ date: string; systolic: number; diastolic: number }>
        pulse: Array<{ date: string; value: number }>
        weight: Array<{ date: string; value: number }>
    }
    eligibilityStatus: {
        isEligible: boolean
        nextEligibleDate?: string
        daysSinceLastDonation: number
        reasonsForIneligibility?: string[]
    }
    achievements: Array<{
        type: 'milestone' | 'streak' | 'health'
        title: string
        description: string
        achievedDate: string
    }>
}

export class DonationHistoryService {
    /**
     * Create a new donation record
     */
    static async createDonationRecord(data: CreateDonationRecord): Promise<DonationRecord> {
        const [newRecord] = await db
            .insert(donationHistorySchema)
            .values({
                donorId: data.donorId,
                bloodBankId: data.bloodBankId,
                appointmentId: data.appointmentId || null,
                donationDate: new Date(data.donationDate),
                bloodType: data.bloodType,
                unitsCollected: data.unitsCollected,
                healthMetrics: data.healthMetrics || null,
                notes: data.notes || null
            })
            .returning()

        // Update donor profile with last donation date and increment total donations
        await db
            .update(donorProfileSchema)
            .set({
                lastDonationDate: new Date(data.donationDate).toISOString().split('T')[0],
                totalDonations: sql`${donorProfileSchema.totalDonations} + 1`,
                updatedAt: new Date()
            })
            .where(eq(donorProfileSchema.id, data.donorId))

        // Update appointment status if provided
        if (data.appointmentId) {
            await db
                .update(appointmentSchema)
                .set({
                    status: 'completed',
                    updatedAt: new Date()
                })
                .where(eq(appointmentSchema.id, data.appointmentId))
        }

        return newRecord as DonationRecord
    }

    /**
     * Update an existing donation record
     */
    static async updateDonationRecord(id: string, data: UpdateDonationRecord): Promise<DonationRecord | null> {
        const updateData: Record<string, unknown> = {}

        if (data.bloodBankId) updateData.bloodBankId = data.bloodBankId
        if (data.donationDate) updateData.donationDate = new Date(data.donationDate)
        if (data.bloodType) updateData.bloodType = data.bloodType
        if (data.unitsCollected !== undefined) updateData.unitsCollected = data.unitsCollected
        if (data.healthMetrics !== undefined) updateData.healthMetrics = data.healthMetrics
        if (data.notes !== undefined) updateData.notes = data.notes

        const [updatedRecord] = await db
            .update(donationHistorySchema)
            .set(updateData)
            .where(eq(donationHistorySchema.id, id))
            .returning()

        return updatedRecord as DonationRecord || null
    }

    /**
     * Get donation history with filtering and pagination
     */
    static async getDonationHistory(query: DonationHistoryQuery) {
        const whereConditions: Parameters<typeof and> = []

        if (query.donorId) {
            whereConditions.push(eq(donationHistorySchema.donorId, query.donorId))
        }

        if (query.bloodBankId) {
            whereConditions.push(eq(donationHistorySchema.bloodBankId, query.bloodBankId))
        }

        if (query.bloodType) {
            whereConditions.push(eq(donationHistorySchema.bloodType, query.bloodType))
        }

        if (query.startDate) {
            whereConditions.push(gte(donationHistorySchema.donationDate, new Date(query.startDate)))
        }

        if (query.endDate) {
            whereConditions.push(lte(donationHistorySchema.donationDate, new Date(query.endDate)))
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

        // Get total count
        const [{ count: totalCount }] = await db
            .select({ count: count() })
            .from(donationHistorySchema)
            .where(whereClause)

        // Get paginated results with joins
        const sortColumn = query.sortBy === 'donationDate' ? donationHistorySchema.donationDate :
            query.sortBy === 'bloodType' ? donationHistorySchema.bloodType :
                query.sortBy === 'unitsCollected' ? donationHistorySchema.unitsCollected :
                    donationHistorySchema.createdAt

        const orderBy = query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn)

        const donations = await db
            .select({
                id: donationHistorySchema.id,
                donorId: donationHistorySchema.donorId,
                bloodBankId: donationHistorySchema.bloodBankId,
                appointmentId: donationHistorySchema.appointmentId,
                donationDate: donationHistorySchema.donationDate,
                bloodType: donationHistorySchema.bloodType,
                unitsCollected: donationHistorySchema.unitsCollected,
                healthMetrics: donationHistorySchema.healthMetrics,
                notes: donationHistorySchema.notes,
                createdAt: donationHistorySchema.createdAt,
                donor: {
                    firstName: donorProfileSchema.firstName,
                    lastName: donorProfileSchema.lastName,
                    bloodType: donorProfileSchema.bloodType
                },
                bloodBank: {
                    name: bloodBankSchema.name,
                    address: bloodBankSchema.address
                }
            })
            .from(donationHistorySchema)
            .leftJoin(donorProfileSchema, eq(donationHistorySchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(query.limit)
            .offset((query.page - 1) * query.limit)

        const totalPages = Math.ceil(totalCount / query.limit)

        return {
            donations: donations as DonationRecord[],
            pagination: {
                page: query.page,
                limit: query.limit,
                total: totalCount,
                totalPages
            }
        }
    }

    /**
     * Get donation statistics for a donor or blood bank
     */
    static async getDonationStats(query: DonationStatsQuery): Promise<DonationStats> {
        const whereConditions: Parameters<typeof and> = []
        const dateRange: { start?: Date; end?: Date } = {}

        if (query.donorId) {
            whereConditions.push(eq(donationHistorySchema.donorId, query.donorId))
        }

        if (query.bloodBankId) {
            whereConditions.push(eq(donationHistorySchema.bloodBankId, query.bloodBankId))
        }

        // Calculate date range based on period
        const now = new Date()
        switch (query.period) {
            case 'week':
                dateRange.start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                dateRange.start = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3
                dateRange.start = new Date(now.getFullYear(), quarterStart, 1)
                break
            case 'year':
                dateRange.start = new Date(now.getFullYear(), 0, 1)
                break
        }

        if (query.startDate) {
            dateRange.start = new Date(query.startDate)
        }

        if (query.endDate) {
            dateRange.end = new Date(query.endDate)
        }

        if (dateRange.start) {
            whereConditions.push(gte(donationHistorySchema.donationDate, dateRange.start))
        }

        if (dateRange.end) {
            whereConditions.push(lte(donationHistorySchema.donationDate, dateRange.end))
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

        // Get basic statistics
        const [basicStats] = await db
            .select({
                totalDonations: count(),
                totalUnitsCollected: sql<number>`COALESCE(SUM(${donationHistorySchema.unitsCollected}), 0)`,
                averageUnitsPerDonation: sql<number>`COALESCE(AVG(${donationHistorySchema.unitsCollected}), 0)`
            })
            .from(donationHistorySchema)
            .where(whereClause)

        // Get donations by blood type
        const donationsByBloodType = await db
            .select({
                bloodType: donationHistorySchema.bloodType,
                count: count()
            })
            .from(donationHistorySchema)
            .where(whereClause)
            .groupBy(donationHistorySchema.bloodType)

        // Get donations by month (last 12 months)
        const donationsByMonth = await db
            .select({
                month: sql<string>`TO_CHAR(${donationHistorySchema.donationDate}, 'YYYY-MM')`,
                count: count(),
                units: sql<number>`COALESCE(SUM(${donationHistorySchema.unitsCollected}), 0)`
            })
            .from(donationHistorySchema)
            .where(and(
                whereClause,
                gte(donationHistorySchema.donationDate, new Date(now.getFullYear() - 1, now.getMonth(), 1))
            ))
            .groupBy(sql`TO_CHAR(${donationHistorySchema.donationDate}, 'YYYY-MM')`)
            .orderBy(sql`TO_CHAR(${donationHistorySchema.donationDate}, 'YYYY-MM')`)

        // Calculate health trends (average health metrics)
        const healthTrends = await db
            .select({
                avgHemoglobin: sql<number>`AVG(CAST(${donationHistorySchema.healthMetrics}->>'hemoglobin' AS NUMERIC))`,
                avgSystolic: sql<number>`AVG(CAST(${donationHistorySchema.healthMetrics}->'bloodPressure'->>'systolic' AS NUMERIC))`,
                avgDiastolic: sql<number>`AVG(CAST(${donationHistorySchema.healthMetrics}->'bloodPressure'->>'diastolic' AS NUMERIC))`,
                avgPulse: sql<number>`AVG(CAST(${donationHistorySchema.healthMetrics}->>'pulse' AS NUMERIC))`
            })
            .from(donationHistorySchema)
            .where(whereClause)

        // Get last donation date for eligibility calculation
        let nextEligibleDate: string | undefined
        let daysSinceLastDonation: number | undefined

        if (query.donorId) {
            const [lastDonation] = await db
                .select({ donationDate: donationHistorySchema.donationDate })
                .from(donationHistorySchema)
                .where(eq(donationHistorySchema.donorId, query.donorId))
                .orderBy(desc(donationHistorySchema.donationDate))
                .limit(1)

            if (lastDonation) {
                const lastDate = new Date(lastDonation.donationDate)
                const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
                daysSinceLastDonation = daysSince

                // Calculate next eligible date (56 days after last donation)
                const nextEligible = new Date(lastDate.getTime() + 56 * 24 * 60 * 60 * 1000)
                nextEligibleDate = nextEligible.toISOString().split('T')[0]
            }
        }

        return {
            totalDonations: basicStats.totalDonations,
            totalUnitsCollected: basicStats.totalUnitsCollected,
            averageUnitsPerDonation: Number(basicStats.averageUnitsPerDonation.toFixed(2)),
            donationsByBloodType: Object.fromEntries(
                donationsByBloodType.map(item => [item.bloodType, item.count])
            ),
            donationsByMonth: donationsByMonth.map(item => ({
                month: item.month,
                count: item.count,
                units: item.units
            })),
            healthTrends: {
                averageHemoglobin: healthTrends[0]?.avgHemoglobin ? Number(healthTrends[0].avgHemoglobin.toFixed(1)) : undefined,
                averageBloodPressure: (healthTrends[0]?.avgSystolic && healthTrends[0]?.avgDiastolic) ? {
                    systolic: Number(healthTrends[0].avgSystolic.toFixed(0)),
                    diastolic: Number(healthTrends[0].avgDiastolic.toFixed(0))
                } : undefined,
                averagePulse: healthTrends[0]?.avgPulse ? Number(healthTrends[0].avgPulse.toFixed(0)) : undefined
            },
            nextEligibleDate,
            daysSinceLastDonation
        }
    }

    /**
     * Get health insights for a donor
     */
    static async getHealthInsights(query: HealthInsights): Promise<HealthInsightData> {
        const now = new Date()
        let dateRange: Date

        switch (query.period) {
            case '3months':
                dateRange = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
                break
            case '6months':
                dateRange = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
                break
            case '1year':
                dateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
                break
            case '2years':
                dateRange = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000)
                break
            default:
                dateRange = new Date(0) // All time
        }

        // Get donation frequency data
        const donations = await db
            .select({
                donationDate: donationHistorySchema.donationDate,
                healthMetrics: donationHistorySchema.healthMetrics
            })
            .from(donationHistorySchema)
            .where(and(
                eq(donationHistorySchema.donorId, query.donorId),
                gte(donationHistorySchema.donationDate, dateRange)
            ))
            .orderBy(asc(donationHistorySchema.donationDate))

        // Calculate donation frequency
        const totalDonations = donations.length
        const donationsThisYear = donations.filter(d =>
            new Date(d.donationDate).getFullYear() === now.getFullYear()
        ).length

        let averageDaysBetweenDonations = 0
        if (donations.length > 1) {
            const daysBetween = []
            for (let i = 1; i < donations.length; i++) {
                const prev = new Date(donations[i - 1].donationDate)
                const curr = new Date(donations[i].donationDate)
                daysBetween.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
            }
            averageDaysBetweenDonations = Math.round(daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length)
        }

        // Extract health metrics trends
        const healthMetricsTrends = {
            hemoglobin: [] as Array<{ date: string; value: number }>,
            bloodPressure: [] as Array<{ date: string; systolic: number; diastolic: number }>,
            pulse: [] as Array<{ date: string; value: number }>,
            weight: [] as Array<{ date: string; value: number }>
        }

        donations.forEach(donation => {
            const date = donation.donationDate.toISOString().split('T')[0]
            const metrics = donation.healthMetrics as Record<string, unknown> | null

            const hemoglobin = metrics?.hemoglobin as number | undefined
            const bloodPressure = metrics?.bloodPressure as { systolic?: number; diastolic?: number } | undefined
            const pulse = metrics?.pulse as number | undefined
            const weight = metrics?.weight as number | undefined

            if (hemoglobin) {
                healthMetricsTrends.hemoglobin.push({ date, value: hemoglobin })
            }

            if (bloodPressure?.systolic && bloodPressure?.diastolic) {
                healthMetricsTrends.bloodPressure.push({
                    date,
                    systolic: bloodPressure.systolic,
                    diastolic: bloodPressure.diastolic
                })
            }

            if (pulse) {
                healthMetricsTrends.pulse.push({ date, value: pulse })
            }

            if (weight) {
                healthMetricsTrends.weight.push({ date, value: weight })
            }
        })

        // Calculate eligibility status
        const lastDonation = donations[donations.length - 1]
        let isEligible = true
        let nextEligibleDate: string | undefined
        let daysSinceLastDonation = 0
        const reasonsForIneligibility: string[] = []

        if (lastDonation) {
            const lastDate = new Date(lastDonation.donationDate)
            daysSinceLastDonation = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

            if (daysSinceLastDonation < 56) {
                isEligible = false
                reasonsForIneligibility.push('Must wait 56 days between donations')
                const nextEligible = new Date(lastDate.getTime() + 56 * 24 * 60 * 60 * 1000)
                nextEligibleDate = nextEligible.toISOString().split('T')[0]
            }
        }

        // Generate achievements
        const achievements = []

        // Milestone achievements
        if (totalDonations >= 1) achievements.push({
            type: 'milestone' as const,
            title: 'First Donation',
            description: 'Completed your first blood donation',
            achievedDate: donations[0]?.donationDate.toISOString().split('T')[0] || ''
        })

        if (totalDonations >= 5) achievements.push({
            type: 'milestone' as const,
            title: '5 Donations',
            description: 'Reached 5 blood donations milestone',
            achievedDate: donations[4]?.donationDate.toISOString().split('T')[0] || ''
        })

        if (totalDonations >= 10) achievements.push({
            type: 'milestone' as const,
            title: '10 Donations',
            description: 'Reached 10 blood donations milestone',
            achievedDate: donations[9]?.donationDate.toISOString().split('T')[0] || ''
        })

        // Health achievements
        const recentHemoglobin = healthMetricsTrends.hemoglobin.slice(-3)
        if (recentHemoglobin.length >= 3 && recentHemoglobin.every(h => h.value >= 12.5)) {
            achievements.push({
                type: 'health' as const,
                title: 'Healthy Hemoglobin',
                description: 'Maintained healthy hemoglobin levels',
                achievedDate: recentHemoglobin[recentHemoglobin.length - 1].date
            })
        }

        return {
            donationFrequency: {
                averageDaysBetweenDonations,
                totalDonations,
                donationsThisYear
            },
            healthMetricsTrends,
            eligibilityStatus: {
                isEligible,
                nextEligibleDate,
                daysSinceLastDonation,
                reasonsForIneligibility: reasonsForIneligibility.length > 0 ? reasonsForIneligibility : undefined
            },
            achievements
        }
    }

    /**
     * Get a single donation record by ID
     */
    static async getDonationById(id: string): Promise<DonationRecord | null> {
        const [donation] = await db
            .select({
                id: donationHistorySchema.id,
                donorId: donationHistorySchema.donorId,
                bloodBankId: donationHistorySchema.bloodBankId,
                appointmentId: donationHistorySchema.appointmentId,
                donationDate: donationHistorySchema.donationDate,
                bloodType: donationHistorySchema.bloodType,
                unitsCollected: donationHistorySchema.unitsCollected,
                healthMetrics: donationHistorySchema.healthMetrics,
                notes: donationHistorySchema.notes,
                createdAt: donationHistorySchema.createdAt,
                donor: {
                    firstName: donorProfileSchema.firstName,
                    lastName: donorProfileSchema.lastName,
                    bloodType: donorProfileSchema.bloodType
                },
                bloodBank: {
                    name: bloodBankSchema.name,
                    address: bloodBankSchema.address
                }
            })
            .from(donationHistorySchema)
            .leftJoin(donorProfileSchema, eq(donationHistorySchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))
            .where(eq(donationHistorySchema.id, id))
            .limit(1)

        return donation as DonationRecord || null
    }

    /**
     * Delete a donation record
     */
    static async deleteDonationRecord(id: string): Promise<boolean> {
        const [deletedRecord] = await db
            .delete(donationHistorySchema)
            .where(eq(donationHistorySchema.id, id))
            .returning({ id: donationHistorySchema.id })

        return !!deletedRecord
    }
}