import { pgTable, uuid, timestamp, varchar, text, boolean } from 'drizzle-orm/pg-core'
import { donorProfileSchema } from './donors'
import { bloodBankSchema } from './blood-banks'

// Appointment schema
export const appointmentSchema = pgTable('appointments', {
    id: uuid('id').primaryKey().defaultRandom(),
    donorId: uuid('donor_id').references(() => donorProfileSchema.id).notNull(),
    bloodBankId: uuid('blood_bank_id').references(() => bloodBankSchema.id).notNull(),
    appointmentDate: timestamp('appointment_date').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // scheduled, completed, cancelled, no_show
    notes: text('notes'),
    reminderSent: boolean('reminder_sent').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})