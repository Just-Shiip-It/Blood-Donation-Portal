import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
    auditLogSchema
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm'
import { TestDataManager } from '../helpers/test-db'

describe('Database Integration Tests', () => {
    let testManager: TestDataManager

    beforeEach(() => {
        testManager = new TestDataManager()
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('User and Profile Management', () => {
        it('should create and retrieve user with donor profile', async () => {
            // Create user
            const [user] = await db.insert(userSchema)
                .values({
                    email: 'test@donor.com',
                    role: 'donor',
                    emailVerified: true,
                    isActive: true
                })
                .returning()

            expect(user.id).toBeDefined()
            expect(user.email).toBe('test@donor.com')
            expect(user.role).toBe('donor')

            // Create donor profile
            const [donorProfile] = await db.insert(donorProfileSchema)
                .values({
                    userId: user.id,
                    firstName: 'John',
                    lastName: 'Donor',
                    dateOfBirth: '1990-01-01',
                    bloodType: 'O+',
                    phone: '555-0123',
                    address: {
                        street: '123 Main St',
                        city: 'Test City',
                        state: 'TS',
                        zipCode: '12345'
                    },
                    medicalHistory: {
                        allergies: ['penicillin'],
                        medications: [],
                        conditions: []
                    },
                    emergencyContact: {
                        name: 'Jane Donor',
                        phone: '555-0124',
                        relationship: 'Spouse'
                    }
                })
                .returning()

            expect(donorProfile.userId).toBe(user.id)
            expect(donorProfile.firstName).toBe('John')
            expect(donorProfile.bloodType).toBe('O+')

            // Test retrieval with join
            const userWithProfile = await db
                .select({
                    user: userSchema,
                    profile: donorProfileSchema
                })
                .from(userSchema)
                .leftJoin(donorProfileSchema, eq(userSchema.id, donorProfileSchema.userId))
                .where(eq(userSchema.id, user.id))

            expect(userWithProfile).toHaveLength(1)
            expect(userWithProfile[0].user.email).toBe('test@donor.com')
            expect(userWithProfile[0].profile?.firstName).toBe('John')
        })

        it('should create and retrieve healthcare facility profile', async () => {
            // Create user
            const [user] = await db.insert(userSchema)
                .values({
                    email: 'facility@hospital.com',
                    role: 'facility',
                    emailVerified: true,
                    isActive: true
                })
                .returning()

            // Create facility profile
            const [facility] = await db.insert(healthcareFacilitySchema)
                .values({
                    name: 'Test Hospital',
                    address: {
                        street: '456 Hospital Ave',
                        city: 'Medical City',
                        state: 'MC',
                        zipCode: '54321'
                    },
                    phone: '555-0911',
                    email: 'facility@hospital.com',
                    facilityType: 'hospital',
                    licenseNumber: 'HOSP-001',
                    isActive: true
                })
                .returning()

            expect(facility.name).toBe('Test Hospital')
            expect(facility.facilityType).toBe('hospital')
            expect(facility.isActive).toBe(true)

            // Test retrieval
            const retrievedFacility = await db
                .select()
                .from(healthcareFacilitySchema)
                .where(eq(healthcareFacilitySchema.email, 'facility@hospital.com'))

            expect(retrievedFacility).toHaveLength(1)
            expect(retrievedFacility[0].name).toBe('Test Hospital')
        })

        it('should handle user deactivation and reactivation', async () => {
            const [user] = await db.insert(userSchema)
                .values({
                    email: 'deactivate@test.com',
                    role: 'donor',
                    emailVerified: true,
                    isActive: true
                })
                .returning()

            // Deactivate user
            const [deactivatedUser] = await db
                .update(userSchema)
                .set({ isActive: false })
                .where(eq(userSchema.id, user.id))
                .returning()

            expect(deactivatedUser.isActive).toBe(false)

            // Reactivate user
            const [reactivatedUser] = await db
                .update(userSchema)
                .set({ isActive: true })
                .where(eq(userSchema.id, user.id))
                .returning()

            expect(reactivatedUser.isActive).toBe(true)
        })
    })

    describe('Blood Bank and Inventory Management', () => {
        it('should create blood bank with inventory', async () => {
            // Create blood bank
            const [bloodBank] = await db.insert(bloodBankSchema)
                .values({
                    name: 'Central Blood Bank',
                    address: {
                        street: '789 Blood Bank Rd',
                        city: 'Blood City',
                        state: 'BC',
                        zipCode: '67890'
                    },
                    phone: '555-0456',
                    email: 'central@bloodbank.com',
                    capacity: 50,
                    operatingHours: {
                        '1': { open: 8, close: 18 },
                        '2': { open: 8, close: 18 },
                        '3': { open: 8, close: 18 },
                        '4': { open: 8, close: 18 },
                        '5': { open: 8, close: 18 }
                    },
                    coordinates: { lat: 40.7128, lng: -74.0060 }
                })
                .returning()

            expect(bloodBank.name).toBe('Central Blood Bank')
            expect(bloodBank.capacity).toBe(50)

            // Create inventory for different blood types
            const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
            const inventoryItems = []

            for (const bloodType of bloodTypes) {
                const [inventory] = await db.insert(bloodInventorySchema)
                    .values({
                        bloodBankId: bloodBank.id,
                        bloodType,
                        unitsAvailable: 25,
                        unitsReserved: 0,
                        minimumThreshold: 5
                    })
                    .returning()

                inventoryItems.push(inventory)
            }

            expect(inventoryItems).toHaveLength(8)

            // Test inventory retrieval
            const allInventory = await db
                .select()
                .from(bloodInventorySchema)
                .where(eq(bloodInventorySchema.bloodBankId, bloodBank.id))
                .orderBy(asc(bloodInventorySchema.bloodType))

            expect(allInventory).toHaveLength(8)
            expect(allInventory[0].bloodType).toBe('A+')
            expect(allInventory[0].unitsAvailable).toBe(25)
        })

        it('should update inventory levels correctly', async () => {
            const bloodBank = await testManager.createTestBloodBank()
            const inventory = await testManager.createTestInventory(bloodBank.id, {
                bloodType: 'O+',
                unitsAvailable: 50,
                unitsReserved: 0
            })

            // Reserve units
            const [updatedInventory] = await db
                .update(bloodInventorySchema)
                .set({
                    unitsReserved: 10,
                    unitsAvailable: 40
                })
                .where(eq(bloodInventorySchema.id, inventory.id))
                .returning()

            expect(updatedInventory.unitsReserved).toBe(10)
            expect(updatedInventory.unitsAvailable).toBe(40)

            // Fulfill reservation (remove reserved units)
            const [fulfilledInventory] = await db
                .update(bloodInventorySchema)
                .set({
                    unitsReserved: 0
                })
                .where(eq(bloodInventorySchema.id, inventory.id))
                .returning()

            expect(fulfilledInventory.unitsReserved).toBe(0)
            expect(fulfilledInventory.unitsAvailable).toBe(40)
        })

        it('should identify low inventory levels', async () => {
            const bloodBank = await testManager.createTestBloodBank()

            // Create inventory with low levels
            await testManager.createTestInventory(bloodBank.id, {
                bloodType: 'A+',
                unitsAvailable: 3, // Below threshold of 5
                minimumThreshold: 5
            })

            await testManager.createTestInventory(bloodBank.id, {
                bloodType: 'O+',
                unitsAvailable: 15, // Above threshold
                minimumThreshold: 5
            })

            // Query for low inventory
            const lowInventory = await db
                .select()
                .from(bloodInventorySchema)
                .where(
                    and(
                        eq(bloodInventorySchema.bloodBankId, bloodBank.id),
                        // unitsAvailable <= minimumThreshold
                    )
                )

            // Note: Drizzle doesn't support column comparisons directly in this version
            // This would typically be handled in the service layer
            const allInventory = await db
                .select()
                .from(bloodInventorySchema)
                .where(eq(bloodInventorySchema.bloodBankId, bloodBank.id))

            const lowItems = allInventory.filter(item => item.unitsAvailable <= item.minimumThreshold)
            expect(lowItems).toHaveLength(1)
            expect(lowItems[0].bloodType).toBe('A+')
        })
    })

    describe('Appointment Management', () => {
        it('should create and manage appointments', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create appointment
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const [appointment] = await db.insert(appointmentSchema)
                .values({
                    donorId: donor.id,
                    bloodBankId: bloodBank.id,
                    appointmentDate,
                    status: 'scheduled',
                    notes: 'Regular donation appointment'
                })
                .returning()

            expect(appointment.donorId).toBe(donor.id)
            expect(appointment.bloodBankId).toBe(bloodBank.id)
            expect(appointment.status).toBe('scheduled')

            // Update appointment status
            const [updatedAppointment] = await db
                .update(appointmentSchema)
                .set({ status: 'completed' })
                .where(eq(appointmentSchema.id, appointment.id))
                .returning()

            expect(updatedAppointment.status).toBe('completed')

            // Test appointment retrieval with joins
            const appointmentWithDetails = await db
                .select({
                    appointment: appointmentSchema,
                    donor: donorProfileSchema,
                    bloodBank: bloodBankSchema
                })
                .from(appointmentSchema)
                .leftJoin(donorProfileSchema, eq(appointmentSchema.donorId, donorProfileSchema.id))
                .leftJoin(bloodBankSchema, eq(appointmentSchema.bloodBankId, bloodBankSchema.id))
                .where(eq(appointmentSchema.id, appointment.id))

            expect(appointmentWithDetails).toHaveLength(1)
            expect(appointmentWithDetails[0].donor?.firstName).toBe(donor.firstName)
            expect(appointmentWithDetails[0].bloodBank?.name).toBe(bloodBank.name)
        })

        it('should filter appointments by date range', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create appointments on different dates
            const dates = [
                new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks
            ]

            for (const date of dates) {
                await db.insert(appointmentSchema)
                    .values({
                        donorId: donor.id,
                        bloodBankId: bloodBank.id,
                        appointmentDate: date,
                        status: 'scheduled'
                    })
            }

            // Filter appointments for next 10 days
            const startDate = new Date()
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 10)

            const filteredAppointments = await db
                .select()
                .from(appointmentSchema)
                .where(
                    and(
                        eq(appointmentSchema.donorId, donor.id),
                        gte(appointmentSchema.appointmentDate, startDate),
                        lte(appointmentSchema.appointmentDate, endDate)
                    )
                )
                .orderBy(asc(appointmentSchema.appointmentDate))

            expect(filteredAppointments).toHaveLength(2) // Tomorrow and next week
        })

        it('should handle appointment cancellation', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            const appointment = await testManager.createTestAppointment(donor.id, bloodBank.id, {
                status: 'scheduled'
            })

            // Cancel appointment
            const [cancelledAppointment] = await db
                .update(appointmentSchema)
                .set({
                    status: 'cancelled',
                    updatedAt: new Date()
                })
                .where(eq(appointmentSchema.id, appointment.id))
                .returning()

            expect(cancelledAppointment.status).toBe('cancelled')
            expect(cancelledAppointment.updatedAt).toBeDefined()
        })
    })

    describe('Blood Request Management', () => {
        it('should create and track blood requests', async () => {
            const facility = await testManager.createTestFacility()

            // Create blood request
            const requiredBy = new Date()
            requiredBy.setDate(requiredBy.getDate() + 2)

            const [bloodRequest] = await db.insert(bloodRequestSchema)
                .values({
                    facilityId: facility.id,
                    bloodType: 'A+',
                    unitsRequested: 5,
                    urgencyLevel: 'routine',
                    requiredBy,
                    status: 'pending',
                    patientInfo: {
                        age: 45,
                        gender: 'M',
                        procedure: 'Surgery'
                    },
                    notes: 'Elective surgery requirement'
                })
                .returning()

            expect(bloodRequest.facilityId).toBe(facility.id)
            expect(bloodRequest.bloodType).toBe('A+')
            expect(bloodRequest.status).toBe('pending')

            // Update request to fulfilled
            const bloodBank = await testManager.createTestBloodBank()
            const fulfilledAt = new Date()

            const [fulfilledRequest] = await db
                .update(bloodRequestSchema)
                .set({
                    status: 'fulfilled',
                    fulfilledBy: bloodBank.id,
                    fulfilledAt,
                    notes: 'Request fulfilled successfully'
                })
                .where(eq(bloodRequestSchema.id, bloodRequest.id))
                .returning()

            expect(fulfilledRequest.status).toBe('fulfilled')
            expect(fulfilledRequest.fulfilledBy).toBe(bloodBank.id)
            expect(fulfilledRequest.fulfilledAt).toBeDefined()
        })

        it('should filter requests by urgency and status', async () => {
            const facility = await testManager.createTestFacility()

            // Create requests with different urgency levels
            const requests = [
                { urgencyLevel: 'routine', status: 'pending' },
                { urgencyLevel: 'urgent', status: 'pending' },
                { urgencyLevel: 'emergency', status: 'fulfilled' },
                { urgencyLevel: 'routine', status: 'fulfilled' }
            ]

            for (const requestData of requests) {
                await testManager.createTestBloodRequest(facility.id, {
                    bloodType: 'O+',
                    unitsRequested: 3,
                    urgencyLevel: requestData.urgencyLevel as any,
                    status: requestData.status as any
                })
            }

            // Filter urgent pending requests
            const urgentPending = await db
                .select()
                .from(bloodRequestSchema)
                .where(
                    and(
                        eq(bloodRequestSchema.facilityId, facility.id),
                        eq(bloodRequestSchema.urgencyLevel, 'urgent'),
                        eq(bloodRequestSchema.status, 'pending')
                    )
                )

            expect(urgentPending).toHaveLength(1)
            expect(urgentPending[0].urgencyLevel).toBe('urgent')

            // Filter all fulfilled requests
            const fulfilledRequests = await db
                .select()
                .from(bloodRequestSchema)
                .where(
                    and(
                        eq(bloodRequestSchema.facilityId, facility.id),
                        eq(bloodRequestSchema.status, 'fulfilled')
                    )
                )

            expect(fulfilledRequests).toHaveLength(2)
        })
    })

    describe('Donation History Tracking', () => {
        it('should record and retrieve donation history', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Record donation
            const donationDate = new Date()
            const [donation] = await db.insert(donationHistorySchema)
                .values({
                    donorId: donor.id,
                    bloodBankId: bloodBank.id,
                    donationDate,
                    bloodType: 'O+',
                    unitsDonated: 1,
                    hemoglobinLevel: 14.5,
                    bloodPressureSystolic: 120,
                    bloodPressureDiastolic: 80,
                    status: 'completed',
                    notes: 'Successful donation'
                })
                .returning()

            expect(donation.donorId).toBe(donor.id)
            expect(donation.bloodType).toBe('O+')
            expect(donation.status).toBe('completed')

            // Update donor's last donation date and total count
            await db
                .update(donorProfileSchema)
                .set({
                    lastDonationDate: donationDate.toISOString().split('T')[0],
                    totalDonations: 1
                })
                .where(eq(donorProfileSchema.id, donor.id))

            // Retrieve donation history with details
            const donationHistory = await db
                .select({
                    donation: donationHistorySchema,
                    bloodBank: bloodBankSchema
                })
                .from(donationHistorySchema)
                .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))
                .where(eq(donationHistorySchema.donorId, donor.id))
                .orderBy(desc(donationHistorySchema.donationDate))

            expect(donationHistory).toHaveLength(1)
            expect(donationHistory[0].donation.bloodType).toBe('O+')
            expect(donationHistory[0].bloodBank?.name).toBe(bloodBank.name)
        })

        it('should calculate donation statistics', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create multiple donations over time
            const donations = [
                { date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), hemoglobin: 14.0 }, // 4 months ago
                { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), hemoglobin: 14.5 },  // 2 months ago
                { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), hemoglobin: 15.0 }    // 5 days ago
            ]

            for (const donationData of donations) {
                await db.insert(donationHistorySchema)
                    .values({
                        donorId: donor.id,
                        bloodBankId: bloodBank.id,
                        donationDate: donationData.date,
                        bloodType: 'O+',
                        unitsDonated: 1,
                        hemoglobinLevel: donationData.hemoglobin,
                        bloodPressureSystolic: 120,
                        bloodPressureDiastolic: 80,
                        status: 'completed'
                    })
            }

            // Get all donations for statistics
            const allDonations = await db
                .select()
                .from(donationHistorySchema)
                .where(eq(donationHistorySchema.donorId, donor.id))
                .orderBy(desc(donationHistorySchema.donationDate))

            expect(allDonations).toHaveLength(3)

            // Calculate statistics
            const totalUnits = allDonations.reduce((sum, d) => sum + d.unitsDonated, 0)
            const avgHemoglobin = allDonations.reduce((sum, d) => sum + d.hemoglobinLevel, 0) / allDonations.length

            expect(totalUnits).toBe(3)
            expect(avgHemoglobin).toBeCloseTo(14.5, 1)

            // Get recent donations (last 90 days)
            const ninetyDaysAgo = new Date()
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

            const recentDonations = await db
                .select()
                .from(donationHistorySchema)
                .where(
                    and(
                        eq(donationHistorySchema.donorId, donor.id),
                        gte(donationHistorySchema.donationDate, ninetyDaysAgo)
                    )
                )

            expect(recentDonations).toHaveLength(2) // Last 2 donations
        })
    })

    describe('Audit Logging', () => {
        it('should create audit logs for important actions', async () => {
            const { user } = await testManager.createTestUser({
                email: 'admin@test.com',
                password: 'test123',
                role: 'admin'
            })

            // Create audit log entry
            const [auditLog] = await db.insert(auditLogSchema)
                .values({
                    userId: user.id,
                    action: 'blood_request_fulfilled',
                    resourceType: 'blood_request',
                    resourceId: 'test-request-id',
                    details: {
                        bloodType: 'O+',
                        unitsRequested: 5,
                        facilityName: 'Test Hospital'
                    },
                    ipAddress: '192.168.1.1',
                    userAgent: 'Test Browser'
                })
                .returning()

            expect(auditLog.userId).toBe(user.id)
            expect(auditLog.action).toBe('blood_request_fulfilled')
            expect(auditLog.resourceType).toBe('blood_request')

            // Retrieve audit logs for user
            const userAuditLogs = await db
                .select()
                .from(auditLogSchema)
                .where(eq(auditLogSchema.userId, user.id))
                .orderBy(desc(auditLogSchema.timestamp))

            expect(userAuditLogs).toHaveLength(1)
            expect(userAuditLogs[0].action).toBe('blood_request_fulfilled')
        })

        it('should filter audit logs by date range and action', async () => {
            const { user } = await testManager.createTestUser({
                email: 'admin@test.com',
                password: 'test123',
                role: 'admin'
            })

            // Create multiple audit log entries
            const actions = [
                'user_login',
                'appointment_created',
                'blood_request_fulfilled',
                'inventory_updated'
            ]

            for (const action of actions) {
                await db.insert(auditLogSchema)
                    .values({
                        userId: user.id,
                        action,
                        resourceType: 'system',
                        resourceId: 'test-id',
                        details: { action },
                        ipAddress: '192.168.1.1'
                    })
            }

            // Filter by specific action
            const loginLogs = await db
                .select()
                .from(auditLogSchema)
                .where(
                    and(
                        eq(auditLogSchema.userId, user.id),
                        eq(auditLogSchema.action, 'user_login')
                    )
                )

            expect(loginLogs).toHaveLength(1)
            expect(loginLogs[0].action).toBe('user_login')

            // Get all logs for user
            const allLogs = await db
                .select()
                .from(auditLogSchema)
                .where(eq(auditLogSchema.userId, user.id))

            expect(allLogs).toHaveLength(4)
        })
    })

    describe('Complex Queries and Relationships', () => {
        it('should perform complex joins across multiple tables', async () => {
            // Create test data
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id, {
                firstName: 'John',
                lastName: 'Donor',
                bloodType: 'O+'
            })

            const bloodBank = await testManager.createTestBloodBank({
                name: 'Central Blood Bank'
            })

            const appointment = await testManager.createTestAppointment(donor.id, bloodBank.id, {
                status: 'completed'
            })

            // Create donation record
            await db.insert(donationHistorySchema)
                .values({
                    donorId: donor.id,
                    bloodBankId: bloodBank.id,
                    appointmentId: appointment.id,
                    donationDate: new Date(),
                    bloodType: 'O+',
                    unitsDonated: 1,
                    hemoglobinLevel: 14.5,
                    bloodPressureSystolic: 120,
                    bloodPressureDiastolic: 80,
                    status: 'completed'
                })

            // Complex query joining all related tables
            const donationDetails = await db
                .select({
                    user: userSchema,
                    donor: donorProfileSchema,
                    appointment: appointmentSchema,
                    donation: donationHistorySchema,
                    bloodBank: bloodBankSchema
                })
                .from(donationHistorySchema)
                .leftJoin(donorProfileSchema, eq(donationHistorySchema.donorId, donorProfileSchema.id))
                .leftJoin(userSchema, eq(donorProfileSchema.userId, userSchema.id))
                .leftJoin(appointmentSchema, eq(donationHistorySchema.appointmentId, appointmentSchema.id))
                .leftJoin(bloodBankSchema, eq(donationHistorySchema.bloodBankId, bloodBankSchema.id))
                .where(eq(donationHistorySchema.donorId, donor.id))

            expect(donationDetails).toHaveLength(1)
            expect(donationDetails[0].user?.email).toBe('donor@test.com')
            expect(donationDetails[0].donor?.firstName).toBe('John')
            expect(donationDetails[0].bloodBank?.name).toBe('Central Blood Bank')
            expect(donationDetails[0].donation.bloodType).toBe('O+')
        })

        it('should handle transaction rollback on error', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'test123',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)

            // Attempt transaction that should fail
            try {
                await db.transaction(async (tx) => {
                    // This should succeed
                    await tx.update(donorProfileSchema)
                        .set({ totalDonations: 5 })
                        .where(eq(donorProfileSchema.id, donor.id))

                    // This should fail due to invalid foreign key
                    await tx.insert(appointmentSchema)
                        .values({
                            donorId: donor.id,
                            bloodBankId: 'invalid-id', // This will cause foreign key constraint error
                            appointmentDate: new Date(),
                            status: 'scheduled'
                        })
                })
            } catch (error) {
                // Transaction should be rolled back
            }

            // Verify that the first update was rolled back
            const [updatedDonor] = await db
                .select()
                .from(donorProfileSchema)
                .where(eq(donorProfileSchema.id, donor.id))

            expect(updatedDonor.totalDonations).toBe(0) // Should not be updated due to rollback
        })
    })
})