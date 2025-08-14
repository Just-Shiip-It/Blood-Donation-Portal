import { db } from '@/lib/db'
import {
    appointmentSchema,
    bloodBankSchema,
    bloodRequestSchema,
    donationHistorySchema,
    donorProfileSchema,
    healthcareFacilitySchema
} from '@/lib/db/schema'
import { and, or, eq, like, gte, lte, desc, asc, sql, count } from 'drizzle-orm'
import { SearchCriteria } from '@/components/search/advanced-search'
import { LocationData } from '@/components/search/location-search'
import { FilterValue } from '@/components/search/filter-system'
import { SearchResult, PaginationInfo } from '@/components/search/search-results'



export interface SearchOptions {
    criteria: SearchCriteria
    location?: LocationData
    filters?: FilterValue
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
}

export interface SearchResponse {
    results: SearchResult[]
    pagination: PaginationInfo
}

export class SearchService {
    /**
     * Perform a comprehensive search across all data types
     */
    static async search(options: SearchOptions): Promise<SearchResponse> {
        const { criteria } = options

        switch (criteria.category) {
            case 'appointments':
                return this.searchAppointments(options)
            case 'blood-banks':
                return this.searchBloodBanks(options)
            case 'requests':
                return this.searchBloodRequests(options)
            case 'donations':
                return this.searchDonations(options)
            default:
                // Search across all categories
                return this.searchAll(options)
        }
    }

    /**
     * Search appointments with filters and location
     */
    static async searchAppointments(options: SearchOptions): Promise<SearchResponse> {
        const { criteria, location, filters, page = 1, pageSize = 20, sortBy = 'appointmentDate', sortDirection = 'desc' } = options

        const baseQuery = db
            .select({
                id: appointmentSchema.id,
                donorId: appointmentSchema.donorId,
                bloodBankId: appointmentSchema.bloodBankId,
                appointmentDate: appointmentSchema.appointmentDate,
                status: appointmentSchema.status,
                notes: appointmentSchema.notes,
                createdAt: appointmentSchema.createdAt,
                // Join with donor profile for blood type
                donorFirstName: donorProfileSchema.firstName,
                donorLastName: donorProfileSchema.lastName,
                donorBloodType: donorProfileSchema.bloodType,
                // Join with blood bank for location
                bloodBankName: bloodBankSchema.name,
                bloodBankAddress: bloodBankSchema.address,
                bloodBankCoordinates: bloodBankSchema.coordinates,
            })
            .from(appointmentSchema)
            .leftJoin(donorProfileSchema, eq(appointmentSchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(appointmentSchema.bloodBankId, bloodBankSchema.id))

        // Build where conditions
        const conditions = []

        // Text search
        if (criteria.query) {
            conditions.push(
                or(
                    like(donorProfileSchema.firstName, `%${criteria.query}%`),
                    like(donorProfileSchema.lastName, `%${criteria.query}%`),
                    like(bloodBankSchema.name, `%${criteria.query}%`),
                    like(appointmentSchema.notes, `%${criteria.query}%`)
                )
            )
        }

        // Status filter
        if (criteria.status || filters?.status) {
            conditions.push(eq(appointmentSchema.status, (criteria.status || filters?.status) as string))
        }

        // Blood type filter
        if (criteria.bloodType || filters?.bloodType) {
            conditions.push(eq(donorProfileSchema.bloodType, (criteria.bloodType || filters?.bloodType) as string))
        }

        // Date range filter
        const dateRange = filters?.dateRange as { from?: string; to?: string } | undefined
        if (criteria.dateFrom || dateRange?.from) {
            const fromDate = criteria.dateFrom || dateRange?.from
            if (fromDate) {
                conditions.push(gte(appointmentSchema.appointmentDate, new Date(fromDate)))
            }
        }
        if (criteria.dateTo || dateRange?.to) {
            const toDate = criteria.dateTo || dateRange?.to
            if (toDate) {
                conditions.push(lte(appointmentSchema.appointmentDate, new Date(toDate)))
            }
        }

        // Location-based filtering
        if (location?.coordinates && location.radius) {
            // Use Haversine formula for distance calculation
            const { lat, lng } = location.coordinates
            const radiusInKm = location.radius * 1.60934 // Convert miles to km

            conditions.push(
                sql`(
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(CAST(${bloodBankSchema.coordinates}->>'lat' AS FLOAT))) * 
            cos(radians(CAST(${bloodBankSchema.coordinates}->>'lng' AS FLOAT)) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(CAST(${bloodBankSchema.coordinates}->>'lat' AS FLOAT)))
          )
        ) <= ${radiusInKm}`
            )
        }

        // Apply conditions and sorting
        let query: typeof baseQuery = baseQuery
        if (conditions.length > 0) {
            query = (baseQuery as any).where(and(...conditions))
        }

        // Apply sorting
        const sortColumn = this.getSortColumn('appointment', sortBy)
        if (sortColumn) {
            query = (query as any).orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))
        }

        // Get total count for pagination
        const countQuery = db
            .select({ count: count() })
            .from(appointmentSchema)
            .leftJoin(donorProfileSchema, eq(appointmentSchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(appointmentSchema.bloodBankId, bloodBankSchema.id))

        if (conditions.length > 0) {
            countQuery.where(and(...conditions))
        }

        const [results, totalResult] = await Promise.all([
            query.limit(pageSize).offset((page - 1) * pageSize),
            countQuery
        ])

        const total = totalResult[0]?.count || 0
        const totalPages = Math.ceil(total / pageSize)

        // Transform results to SearchResult format
        const searchResults: SearchResult[] = results.map(row => ({
            id: row.id,
            type: 'appointment' as const,
            title: `Appointment with ${row.donorFirstName} ${row.donorLastName}`,
            subtitle: row.bloodBankName || 'Unknown Blood Bank',
            description: row.notes || 'Blood donation appointment',
            status: row.status || undefined,
            date: row.appointmentDate || undefined,
            location: this.formatAddress(row.bloodBankAddress),
            bloodType: row.donorBloodType || undefined,
            distance: location?.coordinates && row.bloodBankCoordinates
                ? this.calculateDistance(
                    location.coordinates.lat,
                    location.coordinates.lng,
                    (row.bloodBankCoordinates as { lat: number; lng: number })?.lat,
                    (row.bloodBankCoordinates as { lat: number; lng: number })?.lng
                )
                : undefined,
            metadata: {
                donorId: row.donorId,
                bloodBankId: row.bloodBankId,
                createdAt: row.createdAt,
            },
        }))

        return {
            results: searchResults,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        }
    }

    /**
     * Search blood banks with location-based filtering
     */
    static async searchBloodBanks(options: SearchOptions): Promise<SearchResponse> {
        const { criteria, location, page = 1, pageSize = 20, sortBy = 'name', sortDirection = 'asc' } = options

        const baseQuery = db
            .select({
                id: bloodBankSchema.id,
                name: bloodBankSchema.name,
                address: bloodBankSchema.address,
                phone: bloodBankSchema.phone,
                email: bloodBankSchema.email,
                operatingHours: bloodBankSchema.operatingHours,
                capacity: bloodBankSchema.capacity,
                isActive: bloodBankSchema.isActive,
                coordinates: bloodBankSchema.coordinates,
                createdAt: bloodBankSchema.createdAt,
            })
            .from(bloodBankSchema)

        // Build where conditions
        const conditions = []

        // Text search
        if (criteria.query) {
            conditions.push(
                or(
                    like(bloodBankSchema.name, `%${criteria.query}%`),
                    like(bloodBankSchema.email, `%${criteria.query}%`)
                )
            )
        }

        // Active status
        conditions.push(eq(bloodBankSchema.isActive, true))

        // Location-based filtering
        if (location?.coordinates && location.radius) {
            const { lat, lng } = location.coordinates
            const radiusInKm = location.radius * 1.60934

            conditions.push(
                sql`(
          6371 * acos(
            cos(radians(${lat})) * 
            cos(radians(CAST(${bloodBankSchema.coordinates}->>'lat' AS FLOAT))) * 
            cos(radians(CAST(${bloodBankSchema.coordinates}->>'lng' AS FLOAT)) - radians(${lng})) + 
            sin(radians(${lat})) * 
            sin(radians(CAST(${bloodBankSchema.coordinates}->>'lat' AS FLOAT)))
          )
        ) <= ${radiusInKm}`
            )
        }

        // Apply conditions and sorting
        let query: typeof baseQuery = baseQuery
        if (conditions.length > 0) {
            query = (baseQuery as any).where(and(...conditions))
        }

        // Apply sorting
        const sortColumn = this.getSortColumn('blood-bank', sortBy)
        if (sortColumn) {
            query = (query as any).orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))
        }

        // Get total count
        const countQuery = db.select({ count: count() }).from(bloodBankSchema)
        if (conditions.length > 0) {
            countQuery.where(and(...conditions))
        }

        const [results, totalResult] = await Promise.all([
            query.limit(pageSize).offset((page - 1) * pageSize),
            countQuery
        ])

        const total = totalResult[0]?.count || 0
        const totalPages = Math.ceil(total / pageSize)

        const searchResults: SearchResult[] = results.map(row => ({
            id: row.id,
            type: 'blood-bank' as const,
            title: row.name,
            subtitle: 'Blood Bank',
            description: `Capacity: ${row.capacity} units`,
            status: row.isActive ? 'active' : 'inactive',
            location: this.formatAddress(row.address),
            distance: location?.coordinates && row.coordinates
                ? this.calculateDistance(
                    location.coordinates.lat,
                    location.coordinates.lng,
                    (row.coordinates as { lat: number; lng: number })?.lat,
                    (row.coordinates as { lat: number; lng: number })?.lng
                )
                : undefined,
            metadata: {
                phone: row.phone,
                email: row.email,
                operatingHours: row.operatingHours,
                capacity: row.capacity,
            },
        }))

        return {
            results: searchResults,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        }
    }

    /**
     * Search blood requests with urgency and status filtering
     */
    static async searchBloodRequests(options: SearchOptions): Promise<SearchResponse> {
        const { criteria, location, filters, page = 1, pageSize = 20, sortBy = 'requestDate', sortDirection = 'desc' } = options

        const baseQuery = db
            .select({
                id: bloodRequestSchema.id,
                facilityId: bloodRequestSchema.facilityId,
                bloodType: bloodRequestSchema.bloodType,
                unitsRequested: bloodRequestSchema.unitsRequested,
                urgencyLevel: bloodRequestSchema.urgencyLevel,
                requestDate: bloodRequestSchema.requestDate,
                requiredBy: bloodRequestSchema.requiredBy,
                status: bloodRequestSchema.status,
                notes: bloodRequestSchema.notes,
                // Join with healthcare facility
                facilityName: healthcareFacilitySchema.name,
                facilityAddress: healthcareFacilitySchema.address,
                facilityCoordinates: healthcareFacilitySchema.coordinates,
            })
            .from(bloodRequestSchema)
            .leftJoin(healthcareFacilitySchema, eq(bloodRequestSchema.facilityId, healthcareFacilitySchema.id))

        const conditions = []

        // Text search
        if (criteria.query) {
            conditions.push(
                or(
                    like(healthcareFacilitySchema.name, `%${criteria.query}%`),
                    like(bloodRequestSchema.notes, `%${criteria.query}%`)
                )
            )
        }

        // Blood type filter
        if (criteria.bloodType || filters?.bloodType) {
            const bloodTypes = Array.isArray(filters?.bloodType) ? filters.bloodType : [criteria.bloodType || filters?.bloodType]
            conditions.push(
                or(...bloodTypes.map(type => eq(bloodRequestSchema.bloodType, type)))
            )
        }

        // Status filter
        if (criteria.status || filters?.status) {
            conditions.push(eq(bloodRequestSchema.status, (criteria.status || filters?.status) as string))
        }

        // Urgency filter
        if (criteria.urgencyLevel || filters?.urgencyLevel) {
            conditions.push(eq(bloodRequestSchema.urgencyLevel, (criteria.urgencyLevel || filters?.urgencyLevel) as string))
        }

        // Date range filter
        const dateRange = filters?.dateRange as { from?: string; to?: string } | undefined
        if (criteria.dateFrom || dateRange?.from) {
            const fromDate = criteria.dateFrom || dateRange?.from
            if (fromDate) {
                conditions.push(gte(bloodRequestSchema.requestDate, new Date(fromDate)))
            }
        }
        if (criteria.dateTo || dateRange?.to) {
            const toDate = criteria.dateTo || dateRange?.to
            if (toDate) {
                conditions.push(lte(bloodRequestSchema.requestDate, new Date(toDate)))
            }
        }

        // Apply conditions and sorting
        let query: typeof baseQuery = baseQuery
        if (conditions.length > 0) {
            query = (baseQuery as any).where(and(...conditions))
        }

        // Apply sorting
        const sortColumn = this.getSortColumn('request', sortBy)
        if (sortColumn) {
            query = (query as any).orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))
        }

        // Get total count
        const countQuery = db
            .select({ count: count() })
            .from(bloodRequestSchema)
            .leftJoin(healthcareFacilitySchema, eq(bloodRequestSchema.facilityId, healthcareFacilitySchema.id))

        if (conditions.length > 0) {
            countQuery.where(and(...conditions))
        }

        const [results, totalResult] = await Promise.all([
            query.limit(pageSize).offset((page - 1) * pageSize),
            countQuery
        ])

        const total = totalResult[0]?.count || 0
        const totalPages = Math.ceil(total / pageSize)

        const searchResults: SearchResult[] = results.map(row => ({
            id: row.id,
            type: 'request' as const,
            title: `${row.bloodType} Blood Request`,
            subtitle: row.facilityName || 'Healthcare Facility',
            description: `${row.unitsRequested} units needed by ${row.requiredBy?.toLocaleDateString()}`,
            status: row.status || undefined,
            urgency: this.mapUrgencyLevel(row.urgencyLevel),
            date: row.requestDate || undefined,
            bloodType: row.bloodType || undefined,
            location: this.formatAddress(row.facilityAddress),
            distance: location?.coordinates && row.facilityCoordinates
                ? this.calculateDistance(
                    location.coordinates.lat,
                    location.coordinates.lng,
                    (row.facilityCoordinates as { lat: number; lng: number })?.lat,
                    (row.facilityCoordinates as { lat: number; lng: number })?.lng
                )
                : undefined,
            metadata: {
                facilityId: row.facilityId,
                unitsRequested: row.unitsRequested,
                requiredBy: row.requiredBy,
                notes: row.notes,
            },
        }))

        return {
            results: searchResults,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        }
    }

    /**
     * Search donation history
     */
    static async searchDonations(options: SearchOptions): Promise<SearchResponse> {
        const { criteria, location, filters, page = 1, pageSize = 20, sortBy = 'donationDate', sortDirection = 'desc' } = options

        const baseQuery = db
            .select({
                id: donationHistorySchema.id,
                donorId: donationHistorySchema.donorId,
                bloodBankId: donationHistorySchema.bloodBankId,
                donationDate: donationHistorySchema.donationDate,
                bloodType: donationHistorySchema.bloodType,
                unitsCollected: donationHistorySchema.unitsCollected,
                notes: donationHistorySchema.notes,
                // Join with donor profile
                donorFirstName: donorProfileSchema.firstName,
                donorLastName: donorProfileSchema.lastName,
                // Join with blood bank
                bloodBankName: bloodBankSchema.name,
                bloodBankAddress: bloodBankSchema.address,
                bloodBankCoordinates: bloodBankSchema.coordinates,
            })
            .from(donationHistorySchema)
            .leftJoin(donorProfileSchema, eq(donationHistorySchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))

        const conditions = []

        // Text search
        if (criteria.query) {
            conditions.push(
                or(
                    like(donorProfileSchema.firstName, `%${criteria.query}%`),
                    like(donorProfileSchema.lastName, `%${criteria.query}%`),
                    like(bloodBankSchema.name, `%${criteria.query}%`)
                )
            )
        }

        // Blood type filter
        if (criteria.bloodType || filters?.bloodType) {
            conditions.push(eq(donationHistorySchema.bloodType, (criteria.bloodType || filters?.bloodType) as string))
        }

        // Date range filter
        const dateRange = filters?.dateRange as { from?: string; to?: string } | undefined
        if (criteria.dateFrom || dateRange?.from) {
            const fromDate = criteria.dateFrom || dateRange?.from
            if (fromDate) {
                conditions.push(gte(donationHistorySchema.donationDate, new Date(fromDate)))
            }
        }
        if (criteria.dateTo || dateRange?.to) {
            const toDate = criteria.dateTo || dateRange?.to
            if (toDate) {
                conditions.push(lte(donationHistorySchema.donationDate, new Date(toDate)))
            }
        }

        // Apply conditions and sorting
        let query: typeof baseQuery = baseQuery
        if (conditions.length > 0) {
            query = (baseQuery as any).where(and(...conditions))
        }

        // Apply sorting
        const sortColumn = this.getSortColumn('donation', sortBy)
        if (sortColumn) {
            query = (query as any).orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))
        }

        // Get total count
        const countQuery = db
            .select({ count: count() })
            .from(donationHistorySchema)
            .leftJoin(donorProfileSchema, eq(donationHistorySchema.donorId, donorProfileSchema.id))
            .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))

        if (conditions.length > 0) {
            countQuery.where(and(...conditions))
        }

        const [results, totalResult] = await Promise.all([
            query.limit(pageSize).offset((page - 1) * pageSize),
            countQuery
        ])

        const total = totalResult[0]?.count || 0
        const totalPages = Math.ceil(total / pageSize)

        const searchResults: SearchResult[] = results.map(row => ({
            id: row.id,
            type: 'donation' as const,
            title: `${row.bloodType} Donation`,
            subtitle: `${row.donorFirstName} ${row.donorLastName}`,
            description: `${row.unitsCollected} units collected at ${row.bloodBankName}`,
            date: row.donationDate || undefined,
            bloodType: row.bloodType || undefined,
            location: this.formatAddress(row.bloodBankAddress),
            distance: location?.coordinates && row.bloodBankCoordinates
                ? this.calculateDistance(
                    location.coordinates.lat,
                    location.coordinates.lng,
                    (row.bloodBankCoordinates as { lat: number; lng: number })?.lat,
                    (row.bloodBankCoordinates as { lat: number; lng: number })?.lng
                )
                : undefined,
            metadata: {
                donorId: row.donorId,
                bloodBankId: row.bloodBankId,
                unitsCollected: row.unitsCollected,
                notes: row.notes,
            },
        }))

        return {
            results: searchResults,
            pagination: {
                page,
                pageSize,
                total,
                totalPages,
            },
        }
    }

    /**
     * Search across all categories
     */
    static async searchAll(options: SearchOptions): Promise<SearchResponse> {
        // For simplicity, we'll search appointments by default when no category is specified
        // In a real implementation, you might want to search across multiple tables and combine results
        return this.searchAppointments({ ...options, criteria: { ...options.criteria, category: 'appointments' } })
    }

    /**
     * Get the appropriate sort column for a given table and sort key
     */
    private static getSortColumn(table: string, sortBy: string) {
        const sortMappings = {
            appointment: {
                date: appointmentSchema.appointmentDate,
                status: appointmentSchema.status,
                created: appointmentSchema.createdAt,
            },
            'blood-bank': {
                name: bloodBankSchema.name,
                created: bloodBankSchema.createdAt,
            },
            request: {
                date: bloodRequestSchema.requestDate,
                urgency: bloodRequestSchema.urgencyLevel,
                status: bloodRequestSchema.status,
                required: bloodRequestSchema.requiredBy,
            },
            donation: {
                date: donationHistorySchema.donationDate,
                bloodType: donationHistorySchema.bloodType,
            },
        }

        return sortMappings[table as keyof typeof sortMappings]?.[sortBy as keyof (typeof sortMappings)[keyof typeof sortMappings]]
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 3959 // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLng = (lng2 - lng1) * Math.PI / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    /**
     * Format address object to string
     */
    private static formatAddress(address: unknown): string {
        if (!address) return 'Unknown Location'

        if (typeof address === 'string') return address

        const parts = []
        const addressObj = address as Record<string, string>
        if (addressObj.street) parts.push(addressObj.street)
        if (addressObj.city) parts.push(addressObj.city)
        if (addressObj.state) parts.push(addressObj.state)
        if (addressObj.zipCode) parts.push(addressObj.zipCode)

        return parts.join(', ') || 'Unknown Location'
    }

    /**
     * Map database urgency levels to SearchResult urgency levels
     */
    private static mapUrgencyLevel(urgencyLevel: string): 'routine' | 'urgent' | 'emergency' | undefined {
        switch (urgencyLevel?.toLowerCase()) {
            case 'low':
                return 'routine'
            case 'medium':
                return 'urgent'
            case 'high':
            case 'critical':
                return 'emergency'
            default:
                return undefined
        }
    }
}