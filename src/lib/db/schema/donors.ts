import { pgTable, uuid, varchar, date, integer, boolean, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { userSchema } from './users'

// Donor profile schema
export const donorProfileSchema = pgTable('donor_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth').notNull(),
    bloodType: varchar('blood_type', { length: 5 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    address: jsonb('address'), // Structured address object
    medicalHistory: jsonb('medical_history'),
    emergencyContact: jsonb('emergency_contact'),
    preferences: jsonb('preferences'), // Notification and scheduling preferences
    lastDonationDate: date('last_donation_date'),
    totalDonations: integer('total_donations').default(0),
    isDeferredTemporary: boolean('is_deferred_temporary').default(false),
    isDeferredPermanent: boolean('is_deferred_permanent').default(false),
    deferralReason: text('deferral_reason'),
    deferralEndDate: date('deferral_end_date'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

