import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core'
import { userSchema } from './users'

// Notification preferences schema
export const notificationPreferencesSchema = pgTable('notification_preferences', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id).notNull().unique(),

    // Email preferences
    emailEnabled: boolean('email_enabled').default(true),
    emailAppointmentReminders: boolean('email_appointment_reminders').default(true),
    emailAppointmentConfirmations: boolean('email_appointment_confirmations').default(true),
    emailEmergencyRequests: boolean('email_emergency_requests').default(true),
    emailEligibilityReminders: boolean('email_eligibility_reminders').default(true),
    emailNewsletters: boolean('email_newsletters').default(false),

    // SMS preferences
    smsEnabled: boolean('sms_enabled').default(false),
    smsAppointmentReminders: boolean('sms_appointment_reminders').default(false),
    smsEmergencyRequests: boolean('sms_emergency_requests').default(false),
    smsEligibilityReminders: boolean('sms_eligibility_reminders').default(false),

    // Push notification preferences
    pushEnabled: boolean('push_enabled').default(true),
    pushAppointmentReminders: boolean('push_appointment_reminders').default(true),
    pushEmergencyRequests: boolean('push_emergency_requests').default(true),
    pushEligibilityReminders: boolean('push_eligibility_reminders').default(true),

    // Timing preferences
    reminderHours: varchar('reminder_hours', { length: 10 }).default('24'), // Hours before appointment
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }).default('22:00'),
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).default('08:00'),

    // Emergency notification preferences
    emergencyNotificationRadius: varchar('emergency_notification_radius', { length: 10 }).default('50'), // Miles
    emergencyOnlyMatchingBloodType: boolean('emergency_only_matching_blood_type').default(true),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// Notification log schema for tracking sent notifications
export const notificationLogSchema = pgTable('notification_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id).notNull(),

    // Notification details
    type: varchar('type', { length: 50 }).notNull(), // appointment_reminder, emergency_request, etc.
    channel: varchar('channel', { length: 20 }).notNull(), // email, sms, push
    recipient: varchar('recipient', { length: 255 }).notNull(), // email address or phone number
    subject: varchar('subject', { length: 255 }),
    message: text('message').notNull(),

    // Status tracking
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, sent, failed, delivered
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    failureReason: text('failure_reason'),

    // Related entities
    appointmentId: uuid('appointment_id'), // Reference to appointment if applicable
    requestId: uuid('request_id'), // Reference to blood request if applicable

    // Metadata
    metadata: jsonb('metadata'), // Additional data like template used, etc.

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// Push notification subscriptions schema
export const pushSubscriptionSchema = pgTable('push_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id).notNull(),

    // Push subscription details
    endpoint: text('endpoint').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    authKey: text('auth_key').notNull(),

    // Device/browser info
    userAgent: text('user_agent'),
    deviceType: varchar('device_type', { length: 20 }), // desktop, mobile, tablet

    // Status
    isActive: boolean('is_active').default(true),
    lastUsed: timestamp('last_used').defaultNow(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})

// Emergency notification queue schema
export const emergencyNotificationQueueSchema = pgTable('emergency_notification_queue', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull(), // Reference to blood request

    // Request details
    bloodType: varchar('blood_type', { length: 5 }).notNull(),
    urgencyLevel: varchar('urgency_level', { length: 20 }).notNull(),
    facilityName: varchar('facility_name', { length: 200 }).notNull(),

    // Targeting criteria
    targetBloodTypes: jsonb('target_blood_types').notNull(), // Array of compatible blood types
    maxRadius: varchar('max_radius', { length: 10 }).default('50'), // Miles

    // Processing status
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed
    totalTargetDonors: varchar('total_target_donors', { length: 10 }).default('0'),
    notificationsSent: varchar('notifications_sent', { length: 10 }).default('0'),

    // Timing
    scheduledFor: timestamp('scheduled_for').defaultNow(),
    processedAt: timestamp('processed_at'),
    completedAt: timestamp('completed_at'),

    // Metadata
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
})