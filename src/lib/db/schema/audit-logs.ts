import { pgTable, uuid, varchar, timestamp, jsonb, text } from 'drizzle-orm/pg-core'
import { userSchema } from './users'

// Audit log schema for tracking system activities
export const auditLogSchema = pgTable('audit_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id),
    action: varchar('action', { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource: varchar('resource', { length: 100 }).notNull(), // users, appointments, blood_requests, etc.
    resourceId: uuid('resource_id'), // ID of the affected resource
    oldValues: jsonb('old_values'), // Previous values for updates
    newValues: jsonb('new_values'), // New values for creates/updates
    ipAddress: varchar('ip_address', { length: 45 }), // Support IPv6
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'), // Additional context data
    timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// Activity tracking for user sessions and system usage
export const activityLogSchema = pgTable('activity_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id),
    sessionId: varchar('session_id', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(), // page_view, api_call, form_submit, etc.
    path: varchar('path', { length: 500 }), // URL path or API endpoint
    method: varchar('method', { length: 10 }), // GET, POST, PUT, DELETE
    duration: varchar('duration', { length: 20 }), // Request duration in ms
    statusCode: varchar('status_code', { length: 10 }), // HTTP status code
    metadata: jsonb('metadata'), // Additional tracking data
    timestamp: timestamp('timestamp').defaultNow().notNull(),
})