/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { AppointmentService } from '@/lib/services/appointment'
import { db } from '@/lib/db'
import { appointmentSchema, donorProfileSchema, bloodBankSchema, userSchema } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Test database setup
const testSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Appointment Booking Integration Tests', () => {
    let testDonor: any
    let testBloodBank: any
    let testUser: any

    beforeEach(async () => {
        // Create test user
        const { data: userData, error: userError } = await testSupabase.auth.admin.createUser({
            email: 'test-donor@example.com',
            password: 'testpassword123',
            email_confirm: true
        })

        if (userError) throw userError
        testUser = userData.user

        // Create test blood bank
        const [bloodBank] = await db.insert(bloodBankSchema)
            .values({
                name: 'Test Blood Bank',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                },
                phone: '555-0123',
                email: 'test@bloodbank.com',
                capacity: 20,
                operatingHours: {
                    '1': { open: 9, close: 17 }, // Monday
                    '2': { open: 9, close: 17 }, // Tuesday
                    '3': { open: 9, close: 17 }, // Wednesday
                    '4': { open: 9, close: 17 }, // Thursday
                    '5': { open: 9, close: 17 }, // Friday
                },
                coordinates: { lat: 40.7128, lng: -74.0060 }
            })
            .returning()

        testBloodBank = bloodBank

        // Create test donor profile
        const [donor] = await db.insert(donorProfileSchema)
            .values({
                userId: testUser.id,
                firstName: 'Test',
                lastName: 'Donor',
                dateOfBirth: '1990-01-01',
                bloodType: 'O+',
                phone: '555-0456',
                address: {
                    street: '456 Donor Ave',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                }
            })
            .returning()

        testDonor = donor
    })

    afterEach(async () => {
        // Clean up test data
        if (testDonor) {
            await db.delete(appointmentSchema).where(eq(appointmentSchema.donorId, testDonor.id))
            await db.delete(donorProfileSchema).where(eq(donorProfileSchema.id, testDonor.id))
        }

        if (testBloodBank) {
            await db.delete(bloodBankSchema).where(eq(bloodBankSchema.id, testBloodBank.id))
        }

        if (testUser) {
            await testSupabase.auth.admin.deleteUser(testUser.id)
        }
    })

    describe('Appointment Creation', () => {
        it('should create a new appointment successfully', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7) // Next week
            appointmentDate.setHours(10, 0, 0, 0) // 10 AM

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
                notes: 'Test appointment'
            }

            const appointment = await AppointmentService.createAppointment(testDonor.id, appointmentData)

            expect(appointment).toBeDefined()
            expect(appointment.donorId).toBe(testDonor.id)
            expect(appointment.bloodBankId).toBe(testBloodBank.id)
            expect(appointment.status).toBe('scheduled')
            expect(appointment.notes).toBe('Test appointment')
        })

        it('should reject appointment for deferred donor', async () => {
            // Mark donor as temporarily deferred
            await db.update(donorProfileSchema)
                .set({
                    isDeferredTemporary: true,
                    deferralEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
                })
                .where(eq(donorProfileSchema.id, testDonor.id))

            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
            }

            await expect(
                AppointmentService.createAppointment(testDonor.id, appointmentData)
            ).rejects.toThrow('temporarily deferred')
        })

        it('should reject appointment too soon after last donation', async () => {
            // Set last donation date to 30 days ago (less than 56 day minimum)
            const lastDonationDate = new Date()
            lastDonationDate.setDate(lastDonationDate.getDate() - 30)

            await db.update(donorProfileSchema)
                .set({
                    lastDonationDate: lastDonationDate.toISOString().split('T')[0]
                })
                .where(eq(donorProfileSchema.id, testDonor.id))

            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
            }

            await expect(
                AppointmentService.createAppointment(testDonor.id, appointmentData)
            ).rejects.toThrow('Next donation available')
        })
    })

    describe('Availability Checking', () => {
        it('should check availability correctly', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0) // Monday 10 AM

            const isAvailable = await AppointmentService.checkAvailability(
                testBloodBank.id,
                appointmentDate
            )

            expect(isAvailable).toBe(true)
        })

        it('should return false for outside operating hours', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(20, 0, 0, 0) // 8 PM (outside operating hours)

            const isAvailable = await AppointmentService.checkAvailability(
                testBloodBank.id,
                appointmentDate
            )

            expect(isAvailable).toBe(false)
        })

        it('should return false when capacity is exceeded', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            // Create multiple appointments to exceed capacity
            const maxAppointmentsPerHour = Math.max(1, Math.floor(testBloodBank.capacity / 5))

            for (let i = 0; i < maxAppointmentsPerHour; i++) {
                await db.insert(appointmentSchema).values({
                    donorId: testDonor.id,
                    bloodBankId: testBloodBank.id,
                    appointmentDate,
                    status: 'scheduled'
                })
            }

            const isAvailable = await AppointmentService.checkAvailability(
                testBloodBank.id,
                appointmentDate
            )

            expect(isAvailable).toBe(false)
        })
    })

    describe('Appointment Management', () => {
        let testAppointment: any

        beforeEach(async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
                notes: 'Test appointment'
            }

            testAppointment = await AppointmentService.createAppointment(testDonor.id, appointmentData)
        })

        it('should update appointment successfully', async () => {
            const newDate = new Date()
            newDate.setDate(newDate.getDate() + 14)
            newDate.setHours(14, 0, 0, 0) // 2 PM

            const updateData = {
                appointmentDate: newDate.toISOString(),
                notes: 'Updated appointment'
            }

            const updated = await AppointmentService.updateAppointment(
                testAppointment.id,
                testDonor.id,
                updateData
            )

            expect(updated.notes).toBe('Updated appointment')
            expect(new Date(updated.appointmentDate).getTime()).toBe(newDate.getTime())
        })

        it('should cancel appointment successfully', async () => {
            const cancelled = await AppointmentService.cancelAppointment(
                testAppointment.id,
                testDonor.id
            )

            expect(cancelled.status).toBe('cancelled')
        })

        it('should fetch donor appointments', async () => {
            const appointments = await AppointmentService.getDonorAppointments(testDonor.id, {
                page: 1,
                limit: 10
            })

            expect(appointments).toHaveLength(1)
            expect(appointments[0].id).toBe(testAppointment.id)
            expect(appointments[0].bloodBank.name).toBe(testBloodBank.name)
        })

        it('should fetch blood bank appointments', async () => {
            const appointments = await AppointmentService.getBloodBankAppointments(testBloodBank.id, {
                page: 1,
                limit: 10
            })

            expect(appointments).toHaveLength(1)
            expect(appointments[0].id).toBe(testAppointment.id)
            expect(appointments[0].donor.firstName).toBe(testDonor.firstName)
        })
    })

    describe('Available Slots', () => {
        it('should return available slots for a blood bank', async () => {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 7)

            const slots = await AppointmentService.getAvailableSlots({
                bloodBankId: testBloodBank.id,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })

            expect(slots.length).toBeGreaterThan(0)
            expect(slots[0]).toHaveProperty('bloodBankId')
            expect(slots[0]).toHaveProperty('date')
            expect(slots[0]).toHaveProperty('available')
        })

        it('should filter slots by location', async () => {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 7)

            const slots = await AppointmentService.getAvailableSlots({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                location: {
                    latitude: 40.7128, // Near test blood bank
                    longitude: -74.0060,
                    radius: 10
                }
            })

            expect(slots.length).toBeGreaterThan(0)
            expect(slots.every(slot => slot.bloodBankId === testBloodBank.id)).toBe(true)
        })
    })

    describe('Reminder System', () => {
        it('should identify appointments needing reminders', async () => {
            // Create appointment for tomorrow
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(10, 0, 0, 0)

            await db.insert(appointmentSchema).values({
                donorId: testDonor.id,
                bloodBankId: testBloodBank.id,
                appointmentDate: tomorrow,
                status: 'scheduled',
                reminderSent: false
            })

            const appointmentsForReminders = await AppointmentService.getAppointmentsForReminders()

            expect(appointmentsForReminders.length).toBeGreaterThan(0)
            expect(appointmentsForReminders[0].donor.firstName).toBe(testDonor.firstName)
            expect(appointmentsForReminders[0].bloodBank.name).toBe(testBloodBank.name)
        })

        it('should mark reminder as sent', async () => {
            const [appointment] = await db.insert(appointmentSchema)
                .values({
                    donorId: testDonor.id,
                    bloodBankId: testBloodBank.id,
                    appointmentDate: new Date(),
                    status: 'scheduled',
                    reminderSent: false
                })
                .returning()

            await AppointmentService.markReminderSent(appointment.id)

            const [updated] = await db.select()
                .from(appointmentSchema)
                .where(eq(appointmentSchema.id, appointment.id))

            expect(updated.reminderSent).toBe(true)
        })
    })
})