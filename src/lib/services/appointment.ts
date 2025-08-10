import { db } from '@/lib/db'
import { appointmentSchema, bloodBankSchema, donorProfileSchema } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm'
import type {
    CreateAppointmentInput,
    UpdateAppointmentInput,
    AppointmentAvailabilityQuery,
    AppointmentFilterQuery
} from '@/lib/validations/appointment'

export class AppointmentService {
    // Create a new appointment
    static async createAppointment(donorId: string, input: CreateAppointmentInput) {
        // Check if donor is eligible (not deferred and meets time requirements)
        const donor = await db.select()
            .from(donorProfileSchema)
            .where(eq(donorProfileSchema.id, donorId))
            .limit(1)

        if (!donor.length) {
            throw new Error('Donor not found')
        }

        const donorProfile = donor[0]

        // Check if donor is deferred
        if (donorProfile.isDeferredPermanent) {
            throw new Error('Donor is permanently deferred from donating')
        }

        if (donorProfile.isDeferredTemporary && donorProfile.deferralEndDate) {
            const now = new Date()
            const deferralEnd = new Date(donorProfile.deferralEndDate)
            if (now < deferralEnd) {
                throw new Error(`Donor is temporarily deferred until ${deferralEnd.toDateString()}`)
            }
        }

        // Check minimum time between donations (56 days for whole blood)
        if (donorProfile.lastDonationDate) {
            const lastDonation = new Date(donorProfile.lastDonationDate)
            const minNextDonation = new Date(lastDonation.getTime() + (56 * 24 * 60 * 60 * 1000))
            const appointmentDate = new Date(input.appointmentDate)

            if (appointmentDate < minNextDonation) {
                throw new Error(`Next donation available on ${minNextDonation.toDateString()}`)
            }
        }

        // Check blood bank availability
        const isAvailable = await this.checkAvailability(input.bloodBankId, new Date(input.appointmentDate))
        if (!isAvailable) {
            throw new Error('Selected time slot is not available')
        }

        // Create appointment
        const [appointment] = await db.insert(appointmentSchema)
            .values({
                donorId,
                bloodBankId: input.bloodBankId,
                appointmentDate: new Date(input.appointmentDate),
                status: 'scheduled',
                notes: input.notes,
            })
            .returning()

        return appointment
    }

    // Get appointments for a donor
    static async getDonorAppointments(donorId: string, filters: AppointmentFilterQuery) {
        // Apply filters
        const conditions = [eq(appointmentSchema.donorId, donorId)]

        if (filters.status) {
            conditions.push(eq(appointmentSchema.status, filters.status))
        }

        if (filters.bloodBankId) {
            conditions.push(eq(appointmentSchema.bloodBankId, filters.bloodBankId))
        }

        if (filters.startDate) {
            conditions.push(gte(appointmentSchema.appointmentDate, new Date(filters.startDate)))
        }

        if (filters.endDate) {
            conditions.push(lte(appointmentSchema.appointmentDate, new Date(filters.endDate)))
        }

        const appointments = await db.select({
            id: appointmentSchema.id,
            appointmentDate: appointmentSchema.appointmentDate,
            status: appointmentSchema.status,
            notes: appointmentSchema.notes,
            reminderSent: appointmentSchema.reminderSent,
            createdAt: appointmentSchema.createdAt,
            bloodBank: {
                id: bloodBankSchema.id,
                name: bloodBankSchema.name,
                address: bloodBankSchema.address,
                phone: bloodBankSchema.phone,
                operatingHours: bloodBankSchema.operatingHours,
            }
        })
            .from(appointmentSchema)
            .innerJoin(bloodBankSchema, eq(appointmentSchema.bloodBankId, bloodBankSchema.id))
            .where(and(...conditions))
            .orderBy(desc(appointmentSchema.appointmentDate))
            .limit(filters.limit)
            .offset((filters.page - 1) * filters.limit)

        return appointments
    }

    // Get appointments for a blood bank
    static async getBloodBankAppointments(bloodBankId: string, filters: AppointmentFilterQuery) {
        // Apply filters similar to donor appointments
        const conditions = [eq(appointmentSchema.bloodBankId, bloodBankId)]

        if (filters.status) {
            conditions.push(eq(appointmentSchema.status, filters.status))
        }

        if (filters.startDate) {
            conditions.push(gte(appointmentSchema.appointmentDate, new Date(filters.startDate)))
        }

        if (filters.endDate) {
            conditions.push(lte(appointmentSchema.appointmentDate, new Date(filters.endDate)))
        }

        const appointments = await db.select({
            id: appointmentSchema.id,
            appointmentDate: appointmentSchema.appointmentDate,
            status: appointmentSchema.status,
            notes: appointmentSchema.notes,
            reminderSent: appointmentSchema.reminderSent,
            createdAt: appointmentSchema.createdAt,
            donor: {
                id: donorProfileSchema.id,
                firstName: donorProfileSchema.firstName,
                lastName: donorProfileSchema.lastName,
                bloodType: donorProfileSchema.bloodType,
                phone: donorProfileSchema.phone,
            }
        })
            .from(appointmentSchema)
            .innerJoin(donorProfileSchema, eq(appointmentSchema.donorId, donorProfileSchema.id))
            .where(and(...conditions))
            .orderBy(asc(appointmentSchema.appointmentDate))
            .limit(filters.limit)
            .offset((filters.page - 1) * filters.limit)

        return appointments
    }

    // Update appointment
    static async updateAppointment(appointmentId: string, donorId: string, input: UpdateAppointmentInput) {
        // Verify appointment belongs to donor
        const existing = await db.select()
            .from(appointmentSchema)
            .where(and(
                eq(appointmentSchema.id, appointmentId),
                eq(appointmentSchema.donorId, donorId)
            ))
            .limit(1)

        if (!existing.length) {
            throw new Error('Appointment not found')
        }

        // If updating appointment date, check availability
        if (input.appointmentDate) {
            const isAvailable = await this.checkAvailability(
                existing[0].bloodBankId,
                new Date(input.appointmentDate),
                appointmentId
            )
            if (!isAvailable) {
                throw new Error('Selected time slot is not available')
            }
        }

        const [updated] = await db.update(appointmentSchema)
            .set({
                ...input,
                appointmentDate: input.appointmentDate ? new Date(input.appointmentDate) : undefined,
                updatedAt: new Date(),
            })
            .where(eq(appointmentSchema.id, appointmentId))
            .returning()

        return updated
    }

    // Cancel appointment
    static async cancelAppointment(appointmentId: string, donorId: string) {
        return this.updateAppointment(appointmentId, donorId, { status: 'cancelled' })
    }

    // Check availability for a specific time slot
    static async checkAvailability(bloodBankId: string, appointmentDate: Date, excludeAppointmentId?: string) {
        // Get blood bank capacity and operating hours
        const bloodBank = await db.select()
            .from(bloodBankSchema)
            .where(eq(bloodBankSchema.id, bloodBankId))
            .limit(1)

        if (!bloodBank.length) {
            throw new Error('Blood bank not found')
        }

        const { capacity, operatingHours } = bloodBank[0]

        // Check if appointment is within operating hours
        if (operatingHours) {
            const dayOfWeek = appointmentDate.getDay()
            const hour = appointmentDate.getHours()
            const operatingHoursData = operatingHours as Record<string, { open: number; close: number }>

            // Assuming operating hours format: { "0": { "open": 9, "close": 17 }, ... }
            const dayHours = operatingHoursData[dayOfWeek.toString()]
            if (!dayHours || hour < dayHours.open || hour >= dayHours.close) {
                return false
            }
        }

        // Check current bookings for that time slot (1-hour slots)
        const slotStart = new Date(appointmentDate)
        slotStart.setMinutes(0, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

        const conditions = [
            eq(appointmentSchema.bloodBankId, bloodBankId),
            gte(appointmentSchema.appointmentDate, slotStart),
            lte(appointmentSchema.appointmentDate, slotEnd),
            eq(appointmentSchema.status, 'scheduled')
        ]

        if (excludeAppointmentId) {
            conditions.push(sql`${appointmentSchema.id} != ${excludeAppointmentId}`)
        }

        const existingAppointments = await db.select({ count: sql<number>`count(*)` })
            .from(appointmentSchema)
            .where(and(...conditions))

        const currentBookings = existingAppointments[0]?.count || 0

        // Assume each appointment takes 1 hour and blood bank can handle multiple donors per hour
        // based on capacity (e.g., capacity of 10 means 2 donors per hour)
        const maxAppointmentsPerHour = Math.max(1, Math.floor(capacity / 5))

        return currentBookings < maxAppointmentsPerHour
    }

    // Get available time slots for a blood bank
    static async getAvailableSlots(query: AppointmentAvailabilityQuery) {
        const startDate = new Date(query.startDate)
        const endDate = new Date(query.endDate)
        const availableSlots: { bloodBankId: string; date: Date; available: boolean }[] = []

        // Get blood banks (filtered by location if provided)
        const conditions = [eq(bloodBankSchema.isActive, true)]

        if (query.bloodBankId) {
            conditions.push(eq(bloodBankSchema.id, query.bloodBankId))
        }

        const bloodBanks = await db.select().from(bloodBankSchema).where(and(...conditions))

        // Filter by location if provided
        let filteredBloodBanks = bloodBanks
        if (query.location) {
            filteredBloodBanks = bloodBanks.filter(bank => {
                if (!bank.coordinates) return false
                const coords = bank.coordinates as { lat: number; lng: number }
                const distance = this.calculateDistance(
                    query.location!.latitude,
                    query.location!.longitude,
                    coords.lat,
                    coords.lng
                )
                return distance <= query.location!.radius
            })
        }

        // Generate time slots for each blood bank
        for (const bloodBank of filteredBloodBanks) {
            const currentDate = new Date(startDate)

            while (currentDate <= endDate) {
                // Generate hourly slots based on operating hours
                const operatingHours = bloodBank.operatingHours as Record<string, { open: number; close: number }>
                const dayOfWeek = currentDate.getDay()
                const dayHours = operatingHours?.[dayOfWeek.toString()]

                if (dayHours) {
                    for (let hour = dayHours.open; hour < dayHours.close; hour++) {
                        const slotDate = new Date(currentDate)
                        slotDate.setHours(hour, 0, 0, 0)

                        // Skip past dates
                        if (slotDate <= new Date()) continue

                        const available = await this.checkAvailability(bloodBank.id, slotDate)
                        availableSlots.push({
                            bloodBankId: bloodBank.id,
                            date: slotDate,
                            available
                        })
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1)
            }
        }

        return availableSlots
    }

    // Calculate distance between two coordinates (Haversine formula)
    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 3959 // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // Get appointments that need reminders
    static async getAppointmentsForReminders() {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const dayAfterTomorrow = new Date(tomorrow)
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

        return db.select({
            id: appointmentSchema.id,
            appointmentDate: appointmentSchema.appointmentDate,
            donor: {
                firstName: donorProfileSchema.firstName,
                lastName: donorProfileSchema.lastName,
                phone: donorProfileSchema.phone,
                preferences: donorProfileSchema.preferences,
            },
            bloodBank: {
                name: bloodBankSchema.name,
                address: bloodBankSchema.address,
                phone: bloodBankSchema.phone,
            }
        })
            .from(appointmentSchema)
            .innerJoin(donorProfileSchema, eq(appointmentSchema.donorId, donorProfileSchema.id))
            .innerJoin(bloodBankSchema, eq(appointmentSchema.bloodBankId, bloodBankSchema.id))
            .where(and(
                eq(appointmentSchema.status, 'scheduled'),
                eq(appointmentSchema.reminderSent, false),
                gte(appointmentSchema.appointmentDate, tomorrow),
                lte(appointmentSchema.appointmentDate, dayAfterTomorrow)
            ))
    }

    // Mark reminder as sent
    static async markReminderSent(appointmentId: string) {
        await db.update(appointmentSchema)
            .set({ reminderSent: true })
            .where(eq(appointmentSchema.id, appointmentId))
    }
}