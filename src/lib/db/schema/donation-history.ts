import { pgTable, uuid, timestamp, varchar, integer, jsonb, text } from 'drizzle-orm/pg-core'
import { donorProfileSchema } from './donors'
import { bloodBankSchema } from './blood-banks'
import { appointmentSchema } from './appointments'

// Donation history schema
export const donationHistorySchema = pgTable('donation_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    donorId: uuid('donor_id').references(() => donorProfileSchema.id).notNull(),
    bloodBankId: uuid('blood_bank_id').references(() => bloodBankSchema.id).notNull(),
    appointmentId: uuid('appointment_id').references(() => appointmentSchema.id),
    donationDate: timestamp('donation_date').notNull(),
    bloodType: varchar('blood_type', { length: 5 }).notNull(),
    unitsCollected: integer('units_collected').notNull().default(1),
    healthMetrics: jsonb('health_metrics'), // Blood pressure, hemoglobin, etc.
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
})