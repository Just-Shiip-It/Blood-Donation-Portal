import { pgTable, uuid, varchar, integer, boolean, jsonb, date, timestamp } from 'drizzle-orm/pg-core'

// Blood bank schema
export const bloodBankSchema = pgTable('blood_banks', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    address: jsonb('address').notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    operatingHours: jsonb('operating_hours'),
    capacity: integer('capacity').notNull(),
    isActive: boolean('is_active').default(true),
    coordinates: jsonb('coordinates'), // lat, lng for mapping
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// Blood inventory schema
export const bloodInventorySchema = pgTable('blood_inventory', {
    id: uuid('id').primaryKey().defaultRandom(),
    bloodBankId: uuid('blood_bank_id').references(() => bloodBankSchema.id).notNull(),
    bloodType: varchar('blood_type', { length: 5 }).notNull(),
    unitsAvailable: integer('units_available').notNull().default(0),
    unitsReserved: integer('units_reserved').notNull().default(0),
    minimumThreshold: integer('minimum_threshold').notNull().default(10),
    expirationDate: date('expiration_date'),
    lastUpdated: timestamp('last_updated').defaultNow(),
})