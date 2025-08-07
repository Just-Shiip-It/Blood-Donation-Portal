import { pgTable, uuid, varchar, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

// Healthcare facility schema
export const healthcareFacilitySchema = pgTable('healthcare_facilities', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    address: jsonb('address').notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    licenseNumber: varchar('license_number', { length: 100 }).notNull(),
    facilityType: varchar('facility_type', { length: 50 }).notNull(), // hospital, clinic, emergency
    isActive: boolean('is_active').default(true),
    coordinates: jsonb('coordinates'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})