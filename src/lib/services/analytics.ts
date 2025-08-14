import { db } from '@/lib/db'
import {
    userSchema,
    donorProfileSchema,
    appointmentSchema,
    bloodRequestSchema,
    donationHistorySchema,
    bloodInventorySchema,
    bloodBankSchema,
    healthcareFacilitySchema
} from '@/lib/db/schema'
import { eq, desc, and, gte, lte, count, sum, sql, avg } from 'drizzle-orm'

export interface DashboardMetrics {
    totalUsers: number
    totalDonors: number
    totalBloodBanks: number
    totalFacilities: number
    totalAppointments: number
    totalDonations: number
    totalBloodRequests: number
    activeUsers: number
    recentGrowth: {
        users: number
        donors: number
        appointments: number
        donations: number
    }
}

export interface BloodBankMetrics {
    bloodBankId: string
    totalInventory: number
    lowStockAlerts: number
    appointmentsToday: number
    appointmentsThisWeek: number
    donationsThisMonth: number
    inventoryByType: Array<{
        bloodType: string
        available: number
        reserved: number
        threshold: number
    }>
}

export interface SystemAnalytics {
    userGrowth: Array<{
        date: string
        users: number
        donors: number
    }>
    appointmentTrends: Array<{
        date: string
        scheduled: number
        completed: number
        cancelled: number
    }>
    bloodRequestTrends: Array<{
        date: string
        requests: number
        fulfilled: number
        urgent: number
    }>
    inventoryStatus: Array<{
        bloodType: string
        totalAvailable: number
        totalReserved: number
        averageThreshold: number
    }>
}

export class AnalyticsService {
    /**
     * Get system-wide dashboard metrics
     */
    static async getDashboardMetrics(): Promise<DashboardMetrics> {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Get current totals
        const [
            totalUsers,
            totalDonors,
            totalBloodBanks,
            totalFacilities,
            totalAppointments,
            totalDonations,
            totalBloodRequests,
            activeUsers,
            recentUsers,
            recentDonors,
            recentAppointments,
            recentDonations
        ] = await Promise.all([
            db.select({ count: count() }).from(userSchema).where(eq(userSchema.isActive, true)),
            db.select({ count: count() }).from(donorProfileSchema),
            db.select({ count: count() }).from(bloodBankSchema).where(eq(bloodBankSchema.isActive, true)),
            db.select({ count: count() }).from(healthcareFacilitySchema).where(eq(healthcareFacilitySchema.isActive, true)),
            db.select({ count: count() }).from(appointmentSchema),
            db.select({ count: count() }).from(donationHistorySchema),
            db.select({ count: count() }).from(bloodRequestSchema),
            db.select({ count: count() }).from(userSchema).where(
                and(
                    eq(userSchema.isActive, true),
                    gte(userSchema.updatedAt, thirtyDaysAgo)
                )
            ),
            db.select({ count: count() }).from(userSchema).where(gte(userSchema.createdAt, thirtyDaysAgo)),
            db.select({ count: count() }).from(donorProfileSchema).where(gte(donorProfileSchema.createdAt, thirtyDaysAgo)),
            db.select({ count: count() }).from(appointmentSchema).where(gte(appointmentSchema.createdAt, thirtyDaysAgo)),
            db.select({ count: count() }).from(donationHistorySchema).where(gte(donationHistorySchema.donationDate, thirtyDaysAgo))
        ])

        return {
            totalUsers: totalUsers[0]?.count || 0,
            totalDonors: totalDonors[0]?.count || 0,
            totalBloodBanks: totalBloodBanks[0]?.count || 0,
            totalFacilities: totalFacilities[0]?.count || 0,
            totalAppointments: totalAppointments[0]?.count || 0,
            totalDonations: totalDonations[0]?.count || 0,
            totalBloodRequests: totalBloodRequests[0]?.count || 0,
            activeUsers: activeUsers[0]?.count || 0,
            recentGrowth: {
                users: recentUsers[0]?.count || 0,
                donors: recentDonors[0]?.count || 0,
                appointments: recentAppointments[0]?.count || 0,
                donations: recentDonations[0]?.count || 0
            }
        }
    }

    /**
     * Get blood bank specific metrics
     */
    static async getBloodBankMetrics(bloodBankId: string): Promise<BloodBankMetrics> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        const [
            inventoryData,
            appointmentsToday,
            appointmentsThisWeek,
            donationsThisMonth
        ] = await Promise.all([
            db.select({
                bloodType: bloodInventorySchema.bloodType,
                available: bloodInventorySchema.unitsAvailable,
                reserved: bloodInventorySchema.unitsReserved,
                threshold: bloodInventorySchema.minimumThreshold
            }).from(bloodInventorySchema).where(eq(bloodInventorySchema.bloodBankId, bloodBankId)),

            db.select({ count: count() }).from(appointmentSchema).where(
                and(
                    eq(appointmentSchema.bloodBankId, bloodBankId),
                    gte(appointmentSchema.appointmentDate, today),
                    lte(appointmentSchema.appointmentDate, new Date(today.getTime() + 24 * 60 * 60 * 1000))
                )
            ),

            db.select({ count: count() }).from(appointmentSchema).where(
                and(
                    eq(appointmentSchema.bloodBankId, bloodBankId),
                    gte(appointmentSchema.appointmentDate, weekStart)
                )
            ),

            db.select({ count: count() }).from(donationHistorySchema).where(
                and(
                    eq(donationHistorySchema.bloodBankId, bloodBankId),
                    gte(donationHistorySchema.donationDate, monthStart)
                )
            )
        ])

        const totalInventory = inventoryData.reduce((sum, item) => sum + item.available, 0)
        const lowStockAlerts = inventoryData.filter(item => item.available <= item.threshold).length

        return {
            bloodBankId,
            totalInventory,
            lowStockAlerts,
            appointmentsToday: appointmentsToday[0]?.count || 0,
            appointmentsThisWeek: appointmentsThisWeek[0]?.count || 0,
            donationsThisMonth: donationsThisMonth[0]?.count || 0,
            inventoryByType: inventoryData
        }
    }

    /**
     * Get system analytics for charts and trends
     */
    static async getSystemAnalytics(days: number = 30): Promise<SystemAnalytics> {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // Generate date range for trends
        const dateRange = []
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate)
            date.setDate(startDate.getDate() + i)
            dateRange.push(date.toISOString().split('T')[0])
        }

        // Get user growth data
        const userGrowthData = await db
            .select({
                date: sql<string>`DATE(${userSchema.createdAt})`,
                users: count(),
            })
            .from(userSchema)
            .where(gte(userSchema.createdAt, startDate))
            .groupBy(sql`DATE(${userSchema.createdAt})`)

        const donorGrowthData = await db
            .select({
                date: sql<string>`DATE(${donorProfileSchema.createdAt})`,
                donors: count(),
            })
            .from(donorProfileSchema)
            .where(gte(donorProfileSchema.createdAt, startDate))
            .groupBy(sql`DATE(${donorProfileSchema.createdAt})`)

        // Get appointment trends
        const appointmentTrendsData = await db
            .select({
                date: sql<string>`DATE(${appointmentSchema.createdAt})`,
                status: appointmentSchema.status,
                count: count(),
            })
            .from(appointmentSchema)
            .where(gte(appointmentSchema.createdAt, startDate))
            .groupBy(sql`DATE(${appointmentSchema.createdAt})`, appointmentSchema.status)

        // Get blood request trends
        const bloodRequestTrendsData = await db
            .select({
                date: sql<string>`DATE(${bloodRequestSchema.requestDate})`,
                status: bloodRequestSchema.status,
                urgency: bloodRequestSchema.urgencyLevel,
                count: count(),
            })
            .from(bloodRequestSchema)
            .where(gte(bloodRequestSchema.requestDate, startDate))
            .groupBy(sql`DATE(${bloodRequestSchema.requestDate})`, bloodRequestSchema.status, bloodRequestSchema.urgencyLevel)

        // Get inventory status
        const inventoryStatus = await db
            .select({
                bloodType: bloodInventorySchema.bloodType,
                totalAvailable: sum(bloodInventorySchema.unitsAvailable),
                totalReserved: sum(bloodInventorySchema.unitsReserved),
                averageThreshold: avg(bloodInventorySchema.minimumThreshold),
            })
            .from(bloodInventorySchema)
            .groupBy(bloodInventorySchema.bloodType)

        // Process and format the data
        const userGrowth = dateRange.map(date => {
            const userCount = userGrowthData.find(d => d.date === date)?.users || 0
            const donorCount = donorGrowthData.find(d => d.date === date)?.donors || 0
            return { date, users: userCount, donors: donorCount }
        })

        const appointmentTrends = dateRange.map(date => {
            const dayData = appointmentTrendsData.filter(d => d.date === date)
            return {
                date,
                scheduled: dayData.find(d => d.status === 'scheduled')?.count || 0,
                completed: dayData.find(d => d.status === 'completed')?.count || 0,
                cancelled: dayData.find(d => d.status === 'cancelled')?.count || 0,
            }
        })

        const bloodRequestTrends = dateRange.map(date => {
            const dayData = bloodRequestTrendsData.filter(d => d.date === date)
            return {
                date,
                requests: dayData.reduce((sum, d) => sum + d.count, 0),
                fulfilled: dayData.filter(d => d.status === 'fulfilled').reduce((sum, d) => sum + d.count, 0),
                urgent: dayData.filter(d => d.urgency === 'urgent' || d.urgency === 'emergency').reduce((sum, d) => sum + d.count, 0),
            }
        })

        return {
            userGrowth,
            appointmentTrends,
            bloodRequestTrends,
            inventoryStatus: inventoryStatus.map(item => ({
                bloodType: item.bloodType,
                totalAvailable: Number(item.totalAvailable) || 0,
                totalReserved: Number(item.totalReserved) || 0,
                averageThreshold: Number(item.averageThreshold) || 0,
            }))
        }
    }

    /**
     * Get user management data
     */
    static async getUserManagementData(filters: {
        role?: string
        isActive?: boolean
        limit?: number
        offset?: number
    } = {}) {
        const conditions = []

        if (filters.role) {
            conditions.push(eq(userSchema.role, filters.role))
        }
        if (filters.isActive !== undefined) {
            conditions.push(eq(userSchema.isActive, filters.isActive))
        }

        const users = await db
            .select({
                id: userSchema.id,
                email: userSchema.email,
                role: userSchema.role,
                isActive: userSchema.isActive,
                emailVerified: userSchema.emailVerified,
                createdAt: userSchema.createdAt,
                updatedAt: userSchema.updatedAt,
            })
            .from(userSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(userSchema.createdAt))
            .limit(filters.limit || 50)
            .offset(filters.offset || 0)

        const totalCount = await db
            .select({ count: count() })
            .from(userSchema)
            .where(conditions.length > 0 ? and(...conditions) : undefined)

        return {
            users,
            total: totalCount[0]?.count || 0
        }
    }

    /**
     * Get reporting data for compliance and operational insights
     */
    static async getReportingData(reportType: 'donations' | 'appointments' | 'inventory' | 'users', filters: {
        startDate?: Date
        endDate?: Date
        bloodBankId?: string
        facilityId?: string
    } = {}) {
        const conditions = []

        if (filters.startDate && filters.endDate) {
            switch (reportType) {
                case 'donations':
                    conditions.push(
                        and(
                            gte(donationHistorySchema.donationDate, filters.startDate),
                            lte(donationHistorySchema.donationDate, filters.endDate)
                        )
                    )
                    break
                case 'appointments':
                    conditions.push(
                        and(
                            gte(appointmentSchema.appointmentDate, filters.startDate),
                            lte(appointmentSchema.appointmentDate, filters.endDate)
                        )
                    )
                    break
                case 'users':
                    conditions.push(
                        and(
                            gte(userSchema.createdAt, filters.startDate),
                            lte(userSchema.createdAt, filters.endDate)
                        )
                    )
                    break
            }
        }

        if (filters.bloodBankId) {
            switch (reportType) {
                case 'donations':
                    conditions.push(eq(donationHistorySchema.bloodBankId, filters.bloodBankId))
                    break
                case 'appointments':
                    conditions.push(eq(appointmentSchema.bloodBankId, filters.bloodBankId))
                    break
                case 'inventory':
                    conditions.push(eq(bloodInventorySchema.bloodBankId, filters.bloodBankId))
                    break
            }
        }

        switch (reportType) {
            case 'donations':
                return await db
                    .select()
                    .from(donationHistorySchema)
                    .where(conditions.length > 0 ? and(...conditions) : undefined)
                    .orderBy(desc(donationHistorySchema.donationDate))

            case 'appointments':
                return await db
                    .select()
                    .from(appointmentSchema)
                    .where(conditions.length > 0 ? and(...conditions) : undefined)
                    .orderBy(desc(appointmentSchema.appointmentDate))

            case 'inventory':
                return await db
                    .select()
                    .from(bloodInventorySchema)
                    .where(conditions.length > 0 ? and(...conditions) : undefined)

            case 'users':
                return await db
                    .select()
                    .from(userSchema)
                    .where(conditions.length > 0 ? and(...conditions) : undefined)
                    .orderBy(desc(userSchema.createdAt))

            default:
                throw new Error(`Unsupported report type: ${reportType}`)
        }
    }
}