import { pgTable, uuid, varchar, integer, jsonb, timestamp, text } from 'drizzle-orm/pg-core'
import { healthcareFacilitySchema } from './healthcare-facilities'
import { bloodBankSchema } from './blood-banks'

// Blood request schema
export const bloodRequestSchema = pgTable('blood_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id').references(() => healthcareFacilitySchema.id).notNull(),
    bloodType: varchar('blood_type', { length: 5 }).notNull(),
    unitsRequested: integer('units_requested').notNull(),
    urgencyLevel: varchar('urgency_level', { length: 20 }).notNull(), // routine, urgent, emergency
    patientInfo: jsonb('patient_info'), // Anonymized patient details
    requestDate: timestamp('request_date').defaultNow(),
    requiredBy: timestamp('required_by').notNull(),
    status: varchar('status', { length: 50 }).notNull(), // pending, fulfilled, cancelled
    fulfilledBy: uuid('fulfilled_by').references(() => bloodBankSchema.id),
    fulfilledAt: timestamp('fulfilled_at'),
    notes: text('notes'),
})