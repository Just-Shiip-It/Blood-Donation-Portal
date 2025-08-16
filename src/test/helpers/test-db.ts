import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import {
    userSchema,
    donorProfileSchema,
    bloodBankSchema,
    healthcareFacilitySchema,
    appointmentSchema,
    bloodRequestSchema,
    donationHistorySchema,
    bloodInventorySchema,
    notificationLogSchema
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Test database client
export const testSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Test data cleanup utilities
export class TestDataManager {
    private createdUsers: string[] = []
    private createdDonors: string[] = []
    private createdBloodBanks: string[] = []
    private createdFacilities: string[] = []
    private createdAppointments: string[] = []
    private createdRequests: string[] = []
    private createdDonations: string[] = []
    private createdNotifications: string[] = []

    async createTestUser(userData: {
        email: string
        password: string
        role: 'donor' | 'admin' | 'facility' | 'system_admin'
        emailConfirm?: boolean
    }) {
        const { data, error } = await testSupabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: userData.emailConfirm ?? true
        })

        if (error) throw error

        // Create user record in our database
        const [user] = await db.insert(userSchema)
            .values({
                id: data.user.id,
                email: userData.email,
                role: userData.role,
                emailVerified: userData.emailConfirm ?? true,
                isActive: true
            })
            .returning()

        this.createdUsers.push(user.id)
        return { user, authUser: data.user }
    }

    async createTestDonor(userId: string, donorData?: Partial<{
        firstName: string
        lastName: string
        dateOfBirth: string
        bloodType: string
        phone: string
        lastDonationDate: string
        isDeferredTemporary: boolean
        isDeferredPermanent: boolean
    }>) {
        const [donor] = await db.insert(donorProfileSchema)
            .values({
                userId,
                firstName: donorData?.firstName ?? 'Test',
                lastName: donorData?.lastName ?? 'Donor',
                dateOfBirth: donorData?.dateOfBirth ?? '1990-01-01',
                bloodType: donorData?.bloodType ?? 'O+',
                phone: donorData?.phone ?? '555-0123',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                },
                lastDonationDate: donorData?.lastDonationDate,
                isDeferredTemporary: donorData?.isDeferredTemporary ?? false,
                isDeferredPermanent: donorData?.isDeferredPermanent ?? false
            })
            .returning()

        this.createdDonors.push(donor.id)
        return donor
    }

    async createTestBloodBank(bloodBankData?: Partial<{
        name: string
        phone: string
        email: string
        capacity: number
    }>) {
        const [bloodBank] = await db.insert(bloodBankSchema)
            .values({
                name: bloodBankData?.name ?? 'Test Blood Bank',
                address: {
                    street: '456 Bank Ave',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                },
                phone: bloodBankData?.phone ?? '555-0456',
                email: bloodBankData?.email ?? 'test@bloodbank.com',
                capacity: bloodBankData?.capacity ?? 20,
                operatingHours: {
                    '1': { open: 9, close: 17 },
                    '2': { open: 9, close: 17 },
                    '3': { open: 9, close: 17 },
                    '4': { open: 9, close: 17 },
                    '5': { open: 9, close: 17 }
                },
                coordinates: { lat: 40.7128, lng: -74.0060 }
            })
            .returning()

        this.createdBloodBanks.push(bloodBank.id)
        return bloodBank
    }

    async createTestFacility(facilityData?: Partial<{
        name: string
        phone: string
        email: string
    }>) {
        const [facility] = await db.insert(healthcareFacilitySchema)
            .values({
                name: facilityData?.name ?? 'Test Hospital',
                address: {
                    street: '789 Hospital Rd',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                },
                phone: facilityData?.phone ?? '555-0789',
                email: facilityData?.email ?? 'test@hospital.com',
                facilityType: 'hospital',
                licenseNumber: 'TEST123',
                isActive: true
            })
            .returning()

        this.createdFacilities.push(facility.id)
        return facility
    }

    async createTestInventory(bloodBankId: string, inventoryData?: Partial<{
        bloodType: string
        unitsAvailable: number
        unitsReserved: number
        minimumThreshold: number
    }>) {
        const [inventory] = await db.insert(bloodInventorySchema)
            .values({
                bloodBankId,
                bloodType: inventoryData?.bloodType ?? 'O+',
                unitsAvailable: inventoryData?.unitsAvailable ?? 50,
                unitsReserved: inventoryData?.unitsReserved ?? 0,
                minimumThreshold: inventoryData?.minimumThreshold ?? 10
            })
            .returning()

        return inventory
    }

    async createTestAppointment(donorId: string, bloodBankId: string, appointmentData?: Partial<{
        appointmentDate: Date
        status: string
        notes: string
    }>) {
        const appointmentDate = appointmentData?.appointmentDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        const [appointment] = await db.insert(appointmentSchema)
            .values({
                donorId,
                bloodBankId,
                appointmentDate,
                status: appointmentData?.status ?? 'scheduled',
                notes: appointmentData?.notes
            })
            .returning()

        this.createdAppointments.push(appointment.id)
        return appointment
    }

    async createTestBloodRequest(facilityId: string, requestData?: Partial<{
        bloodType: string
        unitsRequested: number
        urgencyLevel: string
        status: string
    }>) {
        const requiredBy = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow

        const [request] = await db.insert(bloodRequestSchema)
            .values({
                facilityId,
                bloodType: requestData?.bloodType ?? 'O+',
                unitsRequested: requestData?.unitsRequested ?? 5,
                urgencyLevel: requestData?.urgencyLevel ?? 'routine',
                requiredBy,
                status: requestData?.status ?? 'pending',
                patientInfo: {
                    age: 45,
                    gender: 'M',
                    procedure: 'Surgery'
                }
            })
            .returning()

        this.createdRequests.push(request.id)
        return request
    }

    async createTestDonation(donorId: string, bloodBankId: string, appointmentId: string, donationData?: Partial<{
        donationDate: Date
        bloodType: string
        unitsCollected: number
        healthMetrics: any
        notes: string
    }>) {
        const [donation] = await db.insert(donationHistorySchema)
            .values({
                donorId,
                bloodBankId,
                appointmentId,
                donationDate: donationData?.donationDate ?? new Date(),
                bloodType: donationData?.bloodType ?? 'O+',
                unitsCollected: donationData?.unitsCollected ?? 1,
                healthMetrics: donationData?.healthMetrics,
                notes: donationData?.notes
            })
            .returning()

        this.createdDonations.push(donation.id)
        return donation
    }

    async cleanup() {
        try {
            // Clean up in reverse order of dependencies
            if (this.createdNotifications.length > 0) {
                await db.delete(notificationLogSchema)
                    .where(eq(notificationLogSchema.id, this.createdNotifications[0]))
            }

            // Delete donations first (they reference appointments)
            if (this.createdDonations.length > 0) {
                for (const donationId of this.createdDonations) {
                    await db.delete(donationHistorySchema)
                        .where(eq(donationHistorySchema.id, donationId))
                }
            }

            if (this.createdRequests.length > 0) {
                for (const requestId of this.createdRequests) {
                    await db.delete(bloodRequestSchema)
                        .where(eq(bloodRequestSchema.id, requestId))
                }
            }

            // Delete appointments after donations
            if (this.createdAppointments.length > 0) {
                for (const appointmentId of this.createdAppointments) {
                    await db.delete(appointmentSchema)
                        .where(eq(appointmentSchema.id, appointmentId))
                }
            }

            if (this.createdDonors.length > 0) {
                for (const donorId of this.createdDonors) {
                    await db.delete(donorProfileSchema)
                        .where(eq(donorProfileSchema.id, donorId))
                }
            }

            if (this.createdFacilities.length > 0) {
                for (const facilityId of this.createdFacilities) {
                    await db.delete(healthcareFacilitySchema)
                        .where(eq(healthcareFacilitySchema.id, facilityId))
                }
            }

            // Clean up inventory before blood banks
            if (this.createdBloodBanks.length > 0) {
                for (const bloodBankId of this.createdBloodBanks) {
                    await db.delete(bloodInventorySchema)
                        .where(eq(bloodInventorySchema.bloodBankId, bloodBankId))
                }
            }

            if (this.createdBloodBanks.length > 0) {
                for (const bloodBankId of this.createdBloodBanks) {
                    await db.delete(bloodBankSchema)
                        .where(eq(bloodBankSchema.id, bloodBankId))
                }
            }

            // Clean up users from Supabase and our database
            if (this.createdUsers.length > 0) {
                for (const userId of this.createdUsers) {
                    await testSupabase.auth.admin.deleteUser(userId)
                    await db.delete(userSchema)
                        .where(eq(userSchema.id, userId))
                }
            }

            // Reset arrays
            this.createdUsers = []
            this.createdDonors = []
            this.createdBloodBanks = []
            this.createdFacilities = []
            this.createdAppointments = []
            this.createdRequests = []
            this.createdDonations = []
            this.createdNotifications = []
        } catch (error) {
            console.error('Cleanup error:', error)
        }
    }
}

// Helper function to create authenticated request headers
export async function getAuthHeaders(email: string, password: string) {
    const { data, error } = await testSupabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) throw error

    return {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
    }
}

// Mock Next.js request helper
export function createMockRequest(
    method: string,
    url: string,
    body?: any,
    headers?: Record<string, string>
) {
    const request = new Request(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: body ? JSON.stringify(body) : undefined
    })

    return request as any // Cast to NextRequest type
}