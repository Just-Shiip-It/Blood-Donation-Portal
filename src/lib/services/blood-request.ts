import { db } from '@/lib/db'
import { bloodRequestSchema, bloodInventorySchema, bloodBankSchema, healthcareFacilitySchema } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc, or, sql } from 'drizzle-orm'
import type { BloodRequestInput, BloodRequestUpdateInput, BloodRequestFulfillmentInput, BloodRequestFilterInput } from '@/lib/validations/blood-request'

export interface BloodRequest {
    id: string
    facilityId: string
    bloodType: string
    unitsRequested: number
    urgencyLevel: string
    patientInfo?: Record<string, unknown>
    requestDate: Date
    requiredBy: Date
    status: string
    fulfilledBy?: string
    fulfilledAt?: Date
    notes?: string
    facility?: {
        id: string
        name: string
        facilityType: string
    }
    bloodBank?: {
        id: string
        name: string
    }
}

export interface InventoryMatch {
    bloodBankId: string
    bloodBankName: string
    bloodType: string
    unitsAvailable: number
    distance?: number
    coordinates?: Record<string, unknown>
}

/**
 * Create a new blood request
 */
export async function createBloodRequest(
    facilityId: string,
    data: BloodRequestInput
): Promise<BloodRequest> {
    try {
        const [request] = await db
            .insert(bloodRequestSchema)
            .values({
                facilityId,
                bloodType: data.bloodType,
                unitsRequested: data.unitsRequested,
                urgencyLevel: data.urgencyLevel,
                patientInfo: data.patientInfo,
                requiredBy: new Date(data.requiredBy),
                status: 'pending',
                notes: data.notes,
                requestDate: new Date()
            })
            .returning()

        return request as BloodRequest
    } catch (error) {
        console.error('Create blood request error:', error)
        throw new Error('Failed to create blood request')
    }
}

/**
 * Get blood request by ID with facility and blood bank details
 */
export async function getBloodRequestById(id: string): Promise<BloodRequest | null> {
    try {
        const result = await db
            .select({
                id: bloodRequestSchema.id,
                facilityId: bloodRequestSchema.facilityId,
                bloodType: bloodRequestSchema.bloodType,
                unitsRequested: bloodRequestSchema.unitsRequested,
                urgencyLevel: bloodRequestSchema.urgencyLevel,
                patientInfo: bloodRequestSchema.patientInfo,
                requestDate: bloodRequestSchema.requestDate,
                requiredBy: bloodRequestSchema.requiredBy,
                status: bloodRequestSchema.status,
                fulfilledBy: bloodRequestSchema.fulfilledBy,
                fulfilledAt: bloodRequestSchema.fulfilledAt,
                notes: bloodRequestSchema.notes,
                facilityName: healthcareFacilitySchema.name,
                facilityType: healthcareFacilitySchema.facilityType,
                bloodBankName: bloodBankSchema.name
            })
            .from(bloodRequestSchema)
            .leftJoin(healthcareFacilitySchema, eq(bloodRequestSchema.facilityId, healthcareFacilitySchema.id))
            .leftJoin(bloodBankSchema, eq(bloodRequestSchema.fulfilledBy, bloodBankSchema.id))
            .where(eq(bloodRequestSchema.id, id))
            .limit(1)

        if (!result.length) return null

        const row = result[0]
        return {
            id: row.id,
            facilityId: row.facilityId,
            bloodType: row.bloodType,
            unitsRequested: row.unitsRequested,
            urgencyLevel: row.urgencyLevel,
            patientInfo: row.patientInfo as Record<string, unknown> | undefined,
            requestDate: row.requestDate!,
            requiredBy: row.requiredBy,
            status: row.status,
            fulfilledBy: row.fulfilledBy || undefined,
            fulfilledAt: row.fulfilledAt || undefined,
            notes: row.notes || undefined,
            facility: row.facilityName ? {
                id: row.facilityId,
                name: row.facilityName,
                facilityType: row.facilityType!
            } : undefined,
            bloodBank: row.bloodBankName && row.fulfilledBy ? {
                id: row.fulfilledBy,
                name: row.bloodBankName
            } : undefined
        }
    } catch (error) {
        console.error('Get blood request error:', error)
        throw new Error('Failed to get blood request')
    }
}

/**
 * Update blood request
 */
export async function updateBloodRequest(
    id: string,
    data: BloodRequestUpdateInput
): Promise<BloodRequest | null> {
    try {
        const updateData: Record<string, unknown> = { ...data }

        if (data.requiredBy) {
            updateData.requiredBy = new Date(data.requiredBy)
        }

        const [request] = await db
            .update(bloodRequestSchema)
            .set(updateData)
            .where(eq(bloodRequestSchema.id, id))
            .returning()

        return request as BloodRequest || null
    } catch (error) {
        console.error('Update blood request error:', error)
        throw new Error('Failed to update blood request')
    }
}

/**
 * Get blood requests with filtering and pagination
 */
export async function getBloodRequests(filters: BloodRequestFilterInput): Promise<{
    requests: BloodRequest[]
    total: number
    page: number
    limit: number
    totalPages: number
}> {
    try {
        const { page, limit, ...filterParams } = filters
        const offset = (page - 1) * limit

        const whereConditions = []

        if (filterParams.bloodType) {
            whereConditions.push(eq(bloodRequestSchema.bloodType, filterParams.bloodType))
        }

        if (filterParams.urgencyLevel) {
            whereConditions.push(eq(bloodRequestSchema.urgencyLevel, filterParams.urgencyLevel))
        }

        if (filterParams.status) {
            whereConditions.push(eq(bloodRequestSchema.status, filterParams.status))
        }

        if (filterParams.facilityId) {
            whereConditions.push(eq(bloodRequestSchema.facilityId, filterParams.facilityId))
        }

        if (filterParams.dateFrom) {
            whereConditions.push(gte(bloodRequestSchema.requestDate, new Date(filterParams.dateFrom)))
        }

        if (filterParams.dateTo) {
            whereConditions.push(lte(bloodRequestSchema.requestDate, new Date(filterParams.dateTo)))
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

        // Get total count
        const totalResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(bloodRequestSchema)
            .where(whereClause)

        const total = totalResult[0]?.count || 0

        // Get requests with facility details
        const results = await db
            .select({
                id: bloodRequestSchema.id,
                facilityId: bloodRequestSchema.facilityId,
                bloodType: bloodRequestSchema.bloodType,
                unitsRequested: bloodRequestSchema.unitsRequested,
                urgencyLevel: bloodRequestSchema.urgencyLevel,
                patientInfo: bloodRequestSchema.patientInfo,
                requestDate: bloodRequestSchema.requestDate,
                requiredBy: bloodRequestSchema.requiredBy,
                status: bloodRequestSchema.status,
                fulfilledBy: bloodRequestSchema.fulfilledBy,
                fulfilledAt: bloodRequestSchema.fulfilledAt,
                notes: bloodRequestSchema.notes,
                facilityName: healthcareFacilitySchema.name,
                facilityType: healthcareFacilitySchema.facilityType,
                bloodBankName: bloodBankSchema.name
            })
            .from(bloodRequestSchema)
            .leftJoin(healthcareFacilitySchema, eq(bloodRequestSchema.facilityId, healthcareFacilitySchema.id))
            .leftJoin(bloodBankSchema, eq(bloodRequestSchema.fulfilledBy, bloodBankSchema.id))
            .where(whereClause)
            .orderBy(
                // Order by urgency first (emergency, urgent, routine), then by request date
                sql`CASE 
                    WHEN ${bloodRequestSchema.urgencyLevel} = 'emergency' THEN 1
                    WHEN ${bloodRequestSchema.urgencyLevel} = 'urgent' THEN 2
                    WHEN ${bloodRequestSchema.urgencyLevel} = 'routine' THEN 3
                    ELSE 4
                END`,
                desc(bloodRequestSchema.requestDate)
            )
            .limit(limit)
            .offset(offset)

        const requests: BloodRequest[] = results.map(row => ({
            id: row.id,
            facilityId: row.facilityId,
            bloodType: row.bloodType,
            unitsRequested: row.unitsRequested,
            urgencyLevel: row.urgencyLevel,
            patientInfo: row.patientInfo as Record<string, unknown> | undefined,
            requestDate: row.requestDate!,
            requiredBy: row.requiredBy,
            status: row.status,
            fulfilledBy: row.fulfilledBy || undefined,
            fulfilledAt: row.fulfilledAt || undefined,
            notes: row.notes || undefined,
            facility: row.facilityName ? {
                id: row.facilityId,
                name: row.facilityName,
                facilityType: row.facilityType!
            } : undefined,
            bloodBank: row.bloodBankName && row.fulfilledBy ? {
                id: row.fulfilledBy,
                name: row.bloodBankName
            } : undefined
        }))

        return {
            requests,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Get blood requests error:', error)
        throw new Error('Failed to get blood requests')
    }
}

/**
 * Find matching blood inventory for a request
 */
export async function findInventoryMatches(
    bloodType: string,
    unitsNeeded: number,
    facilityCoordinates?: { lat: number; lng: number }
): Promise<InventoryMatch[]> {
    try {
        // Get compatible blood types (for emergency situations)
        const compatibleTypes = getCompatibleBloodTypes(bloodType)

        const results = await db
            .select({
                bloodBankId: bloodInventorySchema.bloodBankId,
                bloodBankName: bloodBankSchema.name,
                bloodType: bloodInventorySchema.bloodType,
                unitsAvailable: bloodInventorySchema.unitsAvailable,
                coordinates: bloodBankSchema.coordinates
            })
            .from(bloodInventorySchema)
            .innerJoin(bloodBankSchema, eq(bloodInventorySchema.bloodBankId, bloodBankSchema.id))
            .where(
                and(
                    or(...compatibleTypes.map(type => eq(bloodInventorySchema.bloodType, type))),
                    gte(bloodInventorySchema.unitsAvailable, unitsNeeded),
                    eq(bloodBankSchema.isActive, true)
                )
            )
            .orderBy(
                // Prioritize exact blood type match, then by available units
                sql`CASE WHEN ${bloodInventorySchema.bloodType} = ${bloodType} THEN 1 ELSE 2 END`,
                desc(bloodInventorySchema.unitsAvailable)
            )

        const matches: InventoryMatch[] = results.map(row => ({
            bloodBankId: row.bloodBankId,
            bloodBankName: row.bloodBankName,
            bloodType: row.bloodType,
            unitsAvailable: row.unitsAvailable,
            coordinates: row.coordinates as Record<string, unknown> | undefined,
            distance: facilityCoordinates && row.coordinates &&
                typeof row.coordinates === 'object' &&
                'lat' in row.coordinates && 'lng' in row.coordinates &&
                typeof row.coordinates.lat === 'number' && typeof row.coordinates.lng === 'number'
                ? calculateDistance(facilityCoordinates, { lat: row.coordinates.lat, lng: row.coordinates.lng })
                : undefined
        }))

        // Sort by distance if coordinates are available
        if (facilityCoordinates) {
            matches.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        }

        return matches
    } catch (error) {
        console.error('Find inventory matches error:', error)
        throw new Error('Failed to find inventory matches')
    }
}

/**
 * Fulfill a blood request
 */
export async function fulfillBloodRequest(
    requestId: string,
    fulfillmentData: BloodRequestFulfillmentInput
): Promise<BloodRequest | null> {
    try {
        return await db.transaction(async (tx) => {
            // Get the request
            const [request] = await tx
                .select()
                .from(bloodRequestSchema)
                .where(eq(bloodRequestSchema.id, requestId))
                .limit(1)

            if (!request || request.status !== 'pending') {
                throw new Error('Request not found or already processed')
            }

            // Check inventory availability
            const [inventory] = await tx
                .select()
                .from(bloodInventorySchema)
                .where(
                    and(
                        eq(bloodInventorySchema.bloodBankId, fulfillmentData.bloodBankId),
                        eq(bloodInventorySchema.bloodType, request.bloodType)
                    )
                )
                .limit(1)

            if (!inventory || inventory.unitsAvailable < fulfillmentData.unitsProvided) {
                throw new Error('Insufficient inventory available')
            }

            // Update inventory (reduce available units, increase reserved units)
            await tx
                .update(bloodInventorySchema)
                .set({
                    unitsAvailable: inventory.unitsAvailable - fulfillmentData.unitsProvided,
                    unitsReserved: inventory.unitsReserved + fulfillmentData.unitsProvided,
                    lastUpdated: new Date()
                })
                .where(
                    and(
                        eq(bloodInventorySchema.bloodBankId, fulfillmentData.bloodBankId),
                        eq(bloodInventorySchema.bloodType, request.bloodType)
                    )
                )

            // Update request status
            const [updatedRequest] = await tx
                .update(bloodRequestSchema)
                .set({
                    status: 'fulfilled',
                    fulfilledBy: fulfillmentData.bloodBankId,
                    fulfilledAt: new Date(),
                    notes: fulfillmentData.notes || request.notes
                })
                .where(eq(bloodRequestSchema.id, requestId))
                .returning()

            return updatedRequest as BloodRequest
        })
    } catch (error) {
        console.error('Fulfill blood request error:', error)
        throw new Error('Failed to fulfill blood request')
    }
}

/**
 * Cancel a blood request
 */
export async function cancelBloodRequest(requestId: string, reason?: string): Promise<BloodRequest | null> {
    try {
        const [request] = await db
            .update(bloodRequestSchema)
            .set({
                status: 'cancelled',
                notes: reason
            })
            .where(eq(bloodRequestSchema.id, requestId))
            .returning()

        return request as BloodRequest || null
    } catch (error) {
        console.error('Cancel blood request error:', error)
        throw new Error('Failed to cancel blood request')
    }
}

/**
 * Get blood requests for a specific facility
 */
export async function getFacilityBloodRequests(
    facilityId: string,
    filters?: Omit<BloodRequestFilterInput, 'facilityId'>
): Promise<{
    requests: BloodRequest[]
    total: number
    page: number
    limit: number
    totalPages: number
}> {
    return getBloodRequests({
        ...filters,
        facilityId,
        page: filters?.page || 1,
        limit: filters?.limit || 10
    })
}

/**
 * Get urgent blood requests (emergency and urgent)
 */
export async function getUrgentBloodRequests(): Promise<BloodRequest[]> {
    try {
        const results = await db
            .select({
                id: bloodRequestSchema.id,
                facilityId: bloodRequestSchema.facilityId,
                bloodType: bloodRequestSchema.bloodType,
                unitsRequested: bloodRequestSchema.unitsRequested,
                urgencyLevel: bloodRequestSchema.urgencyLevel,
                patientInfo: bloodRequestSchema.patientInfo,
                requestDate: bloodRequestSchema.requestDate,
                requiredBy: bloodRequestSchema.requiredBy,
                status: bloodRequestSchema.status,
                fulfilledBy: bloodRequestSchema.fulfilledBy,
                fulfilledAt: bloodRequestSchema.fulfilledAt,
                notes: bloodRequestSchema.notes,
                facilityName: healthcareFacilitySchema.name,
                facilityType: healthcareFacilitySchema.facilityType
            })
            .from(bloodRequestSchema)
            .leftJoin(healthcareFacilitySchema, eq(bloodRequestSchema.facilityId, healthcareFacilitySchema.id))
            .where(
                and(
                    or(
                        eq(bloodRequestSchema.urgencyLevel, 'emergency'),
                        eq(bloodRequestSchema.urgencyLevel, 'urgent')
                    ),
                    eq(bloodRequestSchema.status, 'pending')
                )
            )
            .orderBy(
                sql`CASE 
                    WHEN ${bloodRequestSchema.urgencyLevel} = 'emergency' THEN 1
                    WHEN ${bloodRequestSchema.urgencyLevel} = 'urgent' THEN 2
                    ELSE 3
                END`,
                asc(bloodRequestSchema.requiredBy)
            )

        return results.map(row => ({
            id: row.id,
            facilityId: row.facilityId,
            bloodType: row.bloodType,
            unitsRequested: row.unitsRequested,
            urgencyLevel: row.urgencyLevel,
            patientInfo: row.patientInfo as Record<string, unknown> | undefined,
            requestDate: row.requestDate!,
            requiredBy: row.requiredBy,
            status: row.status,
            fulfilledBy: row.fulfilledBy || undefined,
            fulfilledAt: row.fulfilledAt || undefined,
            notes: row.notes || undefined,
            facility: row.facilityName ? {
                id: row.facilityId,
                name: row.facilityName,
                facilityType: row.facilityType!
            } : undefined
        }))
    } catch (error) {
        console.error('Get urgent blood requests error:', error)
        throw new Error('Failed to get urgent blood requests')
    }
}

/**
 * Get compatible blood types for transfusion
 */
function getCompatibleBloodTypes(bloodType: string): string[] {
    const compatibility: Record<string, string[]> = {
        'A+': ['A+', 'A-', 'O+', 'O-'],
        'A-': ['A-', 'O-'],
        'B+': ['B+', 'B-', 'O+', 'O-'],
        'B-': ['B-', 'O-'],
        'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
        'AB-': ['A-', 'B-', 'AB-', 'O-'],
        'O+': ['O+', 'O-'],
        'O-': ['O-'] // Universal donor, but can only receive O-
    }

    return compatibility[bloodType] || [bloodType]
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}