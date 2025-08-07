import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core'

// User base schema
export const userSchema = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    role: varchar('role', { length: 50 }).notNull(), // donor, admin, facility, system_admin
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    isActive: boolean('is_active').default(true),
    emailVerified: boolean('email_verified').default(false),
})