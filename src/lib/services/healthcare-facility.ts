import { db } from '@/lib/db'
import { healthcareFacilitySchema } from '@/lib/db/schema'
import { eq, and, ilike, or, ne } from 'drizzle-orm'
import type { HealthcareFacilityRegistrationInput, HealthcareFacilityUpdateInput } from '@/lib/validations/healthcare-facility'

export interface HealthcareFacility {
    id: string
    name: string
    address: Record<string, unknown>
    phone: string
    email: string
    licenseNumber: string
    facilityType: string
    isActive: boolean
    coordinates?: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
}

/**
 * Create a new healthcare facility
 */
export async function createHealthcareFacility(
    data: HealthcareFacilityRegistrationInput
): Promise<HealthcareFacility> {
    try {
        const [facility] = await db
            .insert(healthcareFacilitySchema)
            .values({
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                licenseNumber: data.licenseNumber,
                facilityType: data.facilityType,
                coordinates: data.coordinates,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning()

        return facility as HealthcareFacility
    } catch (error) {
        console.error('Create healthcare facility error:', error)
        throw new Error('Failed to create healthcare facility')
    }
}

/**
 * Get healthcare facility by ID
 */
export async function getHealthcareFacilityById(id: string): Promise<HealthcareFacility | null> {
    try {
        const [facility] = await db
            .select()
            .from(healthcareFacilitySchema)
            .where(eq(healthcareFacilitySchema.id, id))
            .limit(1)

        return facility as HealthcareFacility || null
    } catch (error) {
        console.error('Get healthcare facility error:', error)
        throw new Error('Failed to get healthcare facility')
    }
}

/**
 * Get healthcare facility by email
 */
export async function getHealthcareFacilityByEmail(email: string): Promise<HealthcareFacility | null> {
    try {
        const [facility] = await db
            .select()
            .from(healthcareFacilitySchema)
            .where(eq(healthcareFacilitySchema.email, email))
            .limit(1)

        return facility as HealthcareFacility || null
    } catch (error) {
        console.error('Get healthcare facility by email error:', error)
        throw new Error('Failed to get healthcare facility')
    }
}

/**
 * Get healthcare facility by license number
 */
export async function getHealthcareFacilityByLicense(licenseNumber: string): Promise<HealthcareFacility | null> {
    try {
        const [facility] = await db
            .select()
            .from(healthcareFacilitySchema)
            .where(eq(healthcareFacilitySchema.licenseNumber, licenseNumber))
            .limit(1)

        return facility as HealthcareFacility || null
    } catch (error) {
        console.error('Get healthcare facility by license error:', error)
        throw new Error('Failed to get healthcare facility')
    }
}

/**
 * Update healthcare facility
 */
export async function updateHealthcareFacility(
    id: string,
    data: HealthcareFacilityUpdateInput
): Promise<HealthcareFacility | null> {
    try {
        const [facility] = await db
            .update(healthcareFacilitySchema)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(healthcareFacilitySchema.id, id))
            .returning()

        return facility as HealthcareFacility || null
    } catch (error) {
        console.error('Update healthcare facility error:', error)
        throw new Error('Failed to update healthcare facility')
    }
}

/**
 * Get all healthcare facilities with optional filtering
 */
export async function getHealthcareFacilities(filters?: {
    facilityType?: string
    isActive?: boolean
    search?: string
    page?: number
    limit?: number
}): Promise<{
    facilities: HealthcareFacility[]
    total: number
    page: number
    limit: number
    totalPages: number
}> {
    try {
        const page = filters?.page || 1
        const limit = filters?.limit || 10
        const offset = (page - 1) * limit

        const whereConditions = []

        if (filters?.facilityType) {
            whereConditions.push(eq(healthcareFacilitySchema.facilityType, filters.facilityType))
        }

        if (filters?.isActive !== undefined) {
            whereConditions.push(eq(healthcareFacilitySchema.isActive, filters.isActive))
        }

        if (filters?.search) {
            whereConditions.push(
                or(
                    ilike(healthcareFacilitySchema.name, `%${filters.search}%`),
                    ilike(healthcareFacilitySchema.email, `%${filters.search}%`)
                )
            )
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

        // Get total count
        const totalResult = await db
            .select({ count: healthcareFacilitySchema.id })
            .from(healthcareFacilitySchema)
            .where(whereClause)

        const total = totalResult.length

        // Get facilities
        const facilities = await db
            .select()
            .from(healthcareFacilitySchema)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(healthcareFacilitySchema.createdAt)

        return {
            facilities: facilities as HealthcareFacility[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Get healthcare facilities error:', error)
        throw new Error('Failed to get healthcare facilities')
    }
}

/**
 * Delete healthcare facility (soft delete by setting isActive to false)
 */
export async function deleteHealthcareFacility(id: string): Promise<boolean> {
    try {
        const [facility] = await db
            .update(healthcareFacilitySchema)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(healthcareFacilitySchema.id, id))
            .returning()

        return !!facility
    } catch (error) {
        console.error('Delete healthcare facility error:', error)
        throw new Error('Failed to delete healthcare facility')
    }
}

/**
 * Check if healthcare facility exists by email or license
 */
export async function checkHealthcareFacilityExists(
    email: string,
    licenseNumber: string,
    excludeId?: string
): Promise<{ emailExists: boolean; licenseExists: boolean }> {
    try {
        const emailCondition = excludeId
            ? and(
                eq(healthcareFacilitySchema.email, email),
                ne(healthcareFacilitySchema.id, excludeId)
            )
            : eq(healthcareFacilitySchema.email, email)

        const licenseCondition = excludeId
            ? and(
                eq(healthcareFacilitySchema.licenseNumber, licenseNumber),
                ne(healthcareFacilitySchema.id, excludeId)
            )
            : eq(healthcareFacilitySchema.licenseNumber, licenseNumber)

        const [emailCheck, licenseCheck] = await Promise.all([
            db.select({ id: healthcareFacilitySchema.id })
                .from(healthcareFacilitySchema)
                .where(emailCondition)
                .limit(1),
            db.select({ id: healthcareFacilitySchema.id })
                .from(healthcareFacilitySchema)
                .where(licenseCondition)
                .limit(1)
        ])

        return {
            emailExists: emailCheck.length > 0,
            licenseExists: licenseCheck.length > 0
        }
    } catch (error) {
        console.error('Check healthcare facility exists error:', error)
        throw new Error('Failed to check healthcare facility existence')
    }
}