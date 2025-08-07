import { db } from './index'
import {
    userSchema,
    donorProfileSchema,
    bloodBankSchema,
    bloodInventorySchema,
    healthcareFacilitySchema,
    appointmentSchema,
    bloodRequestSchema,
    donationHistorySchema
} from './schema'

// Utility function to format Date objects for date fields (YYYY-MM-DD)
function formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0]
}

export interface SeedOptions {
    users?: number
    donors?: number
    bloodBanks?: number
    facilities?: number
    appointments?: number
    requests?: number
}

const defaultSeedOptions: SeedOptions = {
    users: 10,
    donors: 8,
    bloodBanks: 3,
    facilities: 2,
    appointments: 15,
    requests: 5
}

export async function seedDatabase(options: SeedOptions = defaultSeedOptions) {
    console.log('🌱 Starting database seeding...')

    try {
        // Clear existing data (in reverse order of dependencies)
        await db.delete(donationHistorySchema)
        await db.delete(bloodRequestSchema)
        await db.delete(appointmentSchema)
        await db.delete(bloodInventorySchema)
        await db.delete(donorProfileSchema)
        await db.delete(healthcareFacilitySchema)
        await db.delete(bloodBankSchema)
        await db.delete(userSchema)

        console.log('🧹 Cleared existing data')

        // Seed users
        const users = await seedUsers(options.users || 10)
        console.log(`👥 Created ${users.length} users`)

        // Seed blood banks
        const bloodBanks = await seedBloodBanks(options.bloodBanks || 3)
        console.log(`🏥 Created ${bloodBanks.length} blood banks`)

        // Seed blood inventory
        await seedBloodInventory(bloodBanks)
        console.log('🩸 Created blood inventory')

        // Seed healthcare facilities
        const facilities = await seedHealthcareFacilities(options.facilities || 2)
        console.log(`🏥 Created ${facilities.length} healthcare facilities`)

        // Seed donor profiles
        const donors = await seedDonorProfiles(users.slice(0, options.donors || 8))
        console.log(`🩸 Created ${donors.length} donor profiles`)

        // Seed appointments
        const appointments = await seedAppointments(donors, bloodBanks, options.appointments || 15)
        console.log(`📅 Created ${appointments.length} appointments`)

        // Seed blood requests
        const requests = await seedBloodRequests(facilities, bloodBanks, options.requests || 5)
        console.log(`📋 Created ${requests.length} blood requests`)

        // Seed donation history
        const donations = await seedDonationHistory(donors, bloodBanks, appointments.slice(0, 5))
        console.log(`📊 Created ${donations.length} donation records`)

        console.log('✅ Database seeding completed successfully!')

    } catch (error) {
        console.error('❌ Database seeding failed:', error)
        throw error
    }
}

async function seedUsers(count: number) {
    const users = []
    const roles = ['donor', 'admin', 'facility', 'system_admin']

    for (let i = 0; i < count; i++) {
        const user = {
            email: `user${i + 1}@example.com`,
            role: i < 8 ? 'donor' : roles[Math.floor(Math.random() * roles.length)],
            isActive: true,
            emailVerified: Math.random() > 0.2 // 80% verified
        }
        users.push(user)
    }

    return await db.insert(userSchema).values(users).returning()
}

async function seedBloodBanks(count: number) {
    const bloodBanks = []
    const locations = [
        { name: 'Central Blood Bank', city: 'Downtown', lat: 40.7128, lng: -74.0060 },
        { name: 'Community Blood Center', city: 'Midtown', lat: 40.7589, lng: -73.9851 },
        { name: 'Regional Blood Services', city: 'Uptown', lat: 40.7831, lng: -73.9712 }
    ]

    for (let i = 0; i < count && i < locations.length; i++) {
        const location = locations[i]
        const bloodBank = {
            name: location.name,
            address: {
                street: `${100 + i * 50} Main Street`,
                city: location.city,
                state: 'NY',
                zipCode: `1000${i + 1}`,
                country: 'USA'
            },
            phone: `+1-555-${String(i + 1).padStart(3, '0')}-0000`,
            email: `contact@${location.name.toLowerCase().replace(/\s+/g, '')}.org`,
            operatingHours: {
                monday: { open: '08:00', close: '18:00' },
                tuesday: { open: '08:00', close: '18:00' },
                wednesday: { open: '08:00', close: '18:00' },
                thursday: { open: '08:00', close: '18:00' },
                friday: { open: '08:00', close: '18:00' },
                saturday: { open: '09:00', close: '15:00' },
                sunday: { closed: true }
            },
            capacity: 100 + i * 50,
            isActive: true,
            coordinates: { lat: location.lat, lng: location.lng }
        }
        bloodBanks.push(bloodBank)
    }

    return await db.insert(bloodBankSchema).values(bloodBanks).returning()
}

async function seedBloodInventory(bloodBanks: Array<{ id: string }>) {
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    const inventory = []

    for (const bloodBank of bloodBanks) {
        for (const bloodType of bloodTypes) {
            const units = Math.floor(Math.random() * 50) + 10 // 10-59 units
            const reserved = Math.floor(units * 0.1) // 10% reserved

            inventory.push({
                bloodBankId: bloodBank.id,
                bloodType,
                unitsAvailable: units - reserved,
                unitsReserved: reserved,
                minimumThreshold: 15,
                expirationDate: formatDateForDB(new Date(Date.now() + 35 * 24 * 60 * 60 * 1000)) // 35 days from now
            })
        }
    }

    return await db.insert(bloodInventorySchema).values(inventory).returning()
}

async function seedHealthcareFacilities(count: number) {
    const facilities = []
    const facilityTypes = ['hospital', 'clinic', 'emergency']

    for (let i = 0; i < count; i++) {
        const facility = {
            name: `Healthcare Facility ${i + 1}`,
            address: {
                street: `${200 + i * 100} Medical Drive`,
                city: 'Healthcare District',
                state: 'NY',
                zipCode: `1100${i + 1}`,
                country: 'USA'
            },
            phone: `+1-555-${String(i + 1).padStart(3, '0')}-1000`,
            email: `admin@facility${i + 1}.health`,
            licenseNumber: `HF-${String(i + 1).padStart(6, '0')}`,
            facilityType: facilityTypes[i % facilityTypes.length],
            isActive: true,
            coordinates: { lat: 40.7500 + i * 0.01, lng: -73.9800 + i * 0.01 }
        }
        facilities.push(facility)
    }

    return await db.insert(healthcareFacilitySchema).values(facilities).returning()
}

async function seedDonorProfiles(users: Array<{ id: string }>) {
    const donors = []
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']

    for (let i = 0; i < users.length; i++) {
        const user = users[i]
        const donor = {
            userId: user.id,
            firstName: firstNames[i % firstNames.length],
            lastName: lastNames[i % lastNames.length],
            dateOfBirth: formatDateForDB(new Date(1990 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)),
            bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
            phone: `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
            address: {
                street: `${Math.floor(Math.random() * 9999) + 1} Donor Street`,
                city: 'Donor City',
                state: 'NY',
                zipCode: `${Math.floor(Math.random() * 90000) + 10000}`,
                country: 'USA'
            },
            medicalHistory: {
                allergies: [],
                medications: [],
                conditions: []
            },
            emergencyContact: {
                name: `Emergency Contact ${i + 1}`,
                phone: `+1-555-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
                relationship: 'Family'
            },
            preferences: {
                notifications: {
                    email: true,
                    sms: Math.random() > 0.5,
                    push: true
                },
                preferredTimes: ['morning', 'afternoon'],
                maxDistance: 25
            },
            totalDonations: Math.floor(Math.random() * 10),
            isDeferredTemporary: Math.random() > 0.9, // 10% temporarily deferred
            isDeferredPermanent: false
        }
        donors.push(donor)
    }

    return await db.insert(donorProfileSchema).values(donors).returning()
}

async function seedAppointments(donors: Array<{ id: string }>, bloodBanks: Array<{ id: string }>, count: number) {
    const appointments = []
    const statuses = ['scheduled', 'completed', 'cancelled', 'no_show']

    for (let i = 0; i < count; i++) {
        const donor = donors[Math.floor(Math.random() * donors.length)]
        const bloodBank = bloodBanks[Math.floor(Math.random() * bloodBanks.length)]
        const appointmentDate = new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000) // ±15 days

        const appointment = {
            donorId: donor.id,
            bloodBankId: bloodBank.id,
            appointmentDate,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            notes: Math.random() > 0.7 ? `Appointment note ${i + 1}` : null,
            reminderSent: Math.random() > 0.3 // 70% have reminders sent
        }
        appointments.push(appointment)
    }

    return await db.insert(appointmentSchema).values(appointments).returning()
}

async function seedBloodRequests(facilities: Array<{ id: string }>, bloodBanks: Array<{ id: string }>, count: number) {
    const requests = []
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    const urgencyLevels = ['routine', 'urgent', 'emergency']
    const statuses = ['pending', 'fulfilled', 'cancelled']

    for (let i = 0; i < count; i++) {
        const facility = facilities[Math.floor(Math.random() * facilities.length)]
        const bloodBank = Math.random() > 0.5 ? bloodBanks[Math.floor(Math.random() * bloodBanks.length)] : null
        const requestDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last 7 days
        const requiredBy = new Date(requestDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000) // Next 14 days

        const request = {
            facilityId: facility.id,
            bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
            unitsRequested: Math.floor(Math.random() * 10) + 1,
            urgencyLevel: urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)],
            patientInfo: {
                age: Math.floor(Math.random() * 80) + 18,
                gender: Math.random() > 0.5 ? 'M' : 'F',
                condition: 'Medical procedure'
            },
            requestDate,
            requiredBy,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            fulfilledBy: bloodBank?.id || null,
            fulfilledAt: bloodBank && Math.random() > 0.5 ? new Date(requestDate.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null,
            notes: Math.random() > 0.6 ? `Request note ${i + 1}` : null
        }
        requests.push(request)
    }

    return await db.insert(bloodRequestSchema).values(requests).returning()
}

async function seedDonationHistory(donors: Array<{ id: string; bloodType?: string }>, bloodBanks: Array<{ id: string }>, appointments: Array<{ id: string; donorId: string; bloodBankId: string; appointmentDate: Date }>) {
    const donations = []
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

    for (const appointment of appointments) {
        if (Math.random() > 0.3) { // 70% of appointments result in donations
            const donor = donors.find(d => d.id === appointment.donorId)

            const donation = {
                donorId: appointment.donorId,
                bloodBankId: appointment.bloodBankId,
                appointmentId: appointment.id,
                donationDate: appointment.appointmentDate,
                bloodType: donor?.bloodType || bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
                unitsCollected: 1,
                healthMetrics: {
                    bloodPressure: {
                        systolic: Math.floor(Math.random() * 40) + 110,
                        diastolic: Math.floor(Math.random() * 20) + 70
                    },
                    hemoglobin: (Math.random() * 3 + 12).toFixed(1),
                    pulse: Math.floor(Math.random() * 40) + 60,
                    temperature: (Math.random() * 2 + 97).toFixed(1)
                },
                notes: Math.random() > 0.8 ? 'Successful donation' : null
            }
            donations.push(donation)
        }
    }

    return await db.insert(donationHistorySchema).values(donations).returning()
}

// Utility function to clear all data
export async function clearDatabase() {
    console.log('🧹 Clearing database...')

    try {
        await db.delete(donationHistorySchema)
        await db.delete(bloodRequestSchema)
        await db.delete(appointmentSchema)
        await db.delete(bloodInventorySchema)
        await db.delete(donorProfileSchema)
        await db.delete(healthcareFacilitySchema)
        await db.delete(bloodBankSchema)
        await db.delete(userSchema)

        console.log('✅ Database cleared successfully!')
    } catch (error) {
        console.error('❌ Failed to clear database:', error)
        throw error
    }
}