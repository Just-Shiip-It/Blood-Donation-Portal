import { EmailService, AppointmentEmailData, EmergencyRequestEmailData } from './email'

export interface AppointmentReminderData {
    id: string
    appointmentDate: string
    donor: {
        firstName: string
        lastName: string
        email?: string | null
        phone?: string | null
        preferences?: unknown
        userId?: string
    }
    bloodBank: {
        name: string
        address: { street?: string; city?: string } | unknown
        phone: string
    }
}

export interface NotificationPreferences {
    email: boolean
    sms: boolean
    push: boolean
    reminderHours: number // Hours before appointment to send reminder
}

export interface SMSData {
    to: string
    message: string
}

export interface PushNotificationData {
    userId: string
    title: string
    body: string
    data?: Record<string, unknown>
}

export interface EmergencyNotificationData {
    bloodType: string
    urgencyLevel: 'routine' | 'urgent' | 'emergency'
    facilityName: string
    requestId: string
    eligibleDonorIds: string[]
}

export class NotificationService {
    // Send appointment reminder
    static async sendAppointmentReminder(appointmentId: string, appointment: AppointmentReminderData) {
        try {
            const { donor, bloodBank } = appointment
            const preferences = donor.preferences as NotificationPreferences || {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            const appointmentDate = new Date(appointment.appointmentDate)

            // Prepare email data
            const emailData: AppointmentEmailData = {
                donorName: `${donor.firstName} ${donor.lastName}`,
                appointmentDate: appointmentDate.toLocaleDateString(),
                appointmentTime: appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bloodBankName: bloodBank.name,
                bloodBankAddress: this.formatAddress(bloodBank.address),
                bloodBankPhone: bloodBank.phone,
                appointmentId: appointmentId
            }

            // Send email reminder if enabled and email available
            if (preferences.email && donor.email) {
                await EmailService.sendAppointmentReminder(emailData, donor.email)
            }

            // Send SMS reminder if enabled and phone number available
            if (preferences.sms && donor.phone) {
                const smsMessage = this.generateReminderMessage(appointment)
                await this.sendSMSReminder(donor.phone, smsMessage)
            }

            // Send push notification if enabled
            if (preferences.push && donor.userId) {
                await this.sendPushNotification(donor.userId, {
                    title: 'Blood Donation Reminder',
                    body: `Your appointment is tomorrow at ${emailData.appointmentTime}`,
                    data: { appointmentId, type: 'reminder' }
                })
            }

            console.log(`Reminder sent for appointment ${appointmentId}`)
            return true
        } catch (error) {
            console.error(`Failed to send reminder for appointment ${appointmentId}:`, error)
            return false
        }
    }

    // Generate reminder message
    private static generateReminderMessage(appointment: AppointmentReminderData): string {
        const { donor, bloodBank, appointmentDate } = appointment
        const time = new Date(appointmentDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })

        const address = this.formatAddress(bloodBank.address)
        return `Hi ${donor.firstName}, this is a reminder that you have a blood donation appointment tomorrow at ${time} at ${bloodBank.name}. Address: ${address}. Please arrive 15 minutes early. Thank you for your donation!`
    }

    // Format address helper
    private static formatAddress(address: { street?: string; city?: string } | unknown): string {
        if (!address || typeof address !== 'object') return 'Address not available'

        const addr = address as { street?: string; city?: string; state?: string; zipCode?: string }
        const parts = [
            addr.street,
            addr.city,
            addr.state,
            addr.zipCode
        ].filter(Boolean)

        return parts.join(', ') || 'Address not available'
    }

    // Send SMS reminder using external SMS service
    private static async sendSMSReminder(phoneNumber: string, message: string): Promise<boolean> {
        try {
            // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
            console.log('SMS reminder would be sent to:', phoneNumber)
            console.log('Message:', message)

            // Example integration with Twilio:
            /*
            const accountSid = process.env.TWILIO_ACCOUNT_SID
            const authToken = process.env.TWILIO_AUTH_TOKEN
            const client = require('twilio')(accountSid, authToken)
            
            await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            })
            */

            // For now, simulate successful SMS sending
            return true
        } catch (error) {
            console.error('Failed to send SMS:', error)
            return false
        }
    }

    // Send push notification using web push or Firebase
    private static async sendPushNotification(userId: string, notification: { title: string; body: string; data?: Record<string, unknown> }): Promise<boolean> {
        try {
            // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
            console.log('Push notification would be sent to user:', userId)
            console.log('Notification:', notification)

            // Example integration with Firebase Cloud Messaging:
            /*
            const admin = require('firebase-admin')
            
            const payload = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    icon: '/icon-192x192.png'
                },
                data: notification.data || {}
            }
            
            await admin.messaging().sendToTopic(`user_${userId}`, payload)
            */

            // For now, simulate successful push notification
            return true
        } catch (error) {
            console.error('Failed to send push notification:', error)
            return false
        }
    }

    // Process all pending reminders (to be called by cron job)
    static async processAppointmentReminders() {
        try {
            // TODO: Implement appointment service integration
            // const appointmentsForReminders = await AppointmentService.getAppointmentsForReminders()

            console.log('Processing appointment reminders...')

            // Placeholder for now - in real implementation, this would:
            // 1. Query database for appointments needing reminders
            // 2. Check if reminder hasn't been sent yet
            // 3. Send reminders based on user preferences

            /*
            for (const appointment of appointmentsForReminders) {
                const appointmentData = {
                    ...appointment,
                    appointmentDate: appointment.appointmentDate.toISOString()
                }
                await this.sendAppointmentReminder(appointment.id, appointmentData)

                // Add small delay to avoid overwhelming services
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            */

            console.log('Finished processing appointment reminders')
        } catch (error) {
            console.error('Error processing appointment reminders:', error)
        }
    }

    // Send appointment confirmation
    static async sendAppointmentConfirmation(appointment: AppointmentReminderData): Promise<boolean> {
        try {
            const { donor, bloodBank, appointmentDate } = appointment
            const appointmentDateObj = new Date(appointmentDate)

            // Prepare email data
            const emailData: AppointmentEmailData = {
                donorName: `${donor.firstName} ${donor.lastName}`,
                appointmentDate: appointmentDateObj.toLocaleDateString(),
                appointmentTime: appointmentDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bloodBankName: bloodBank.name,
                bloodBankAddress: this.formatAddress(bloodBank.address),
                bloodBankPhone: bloodBank.phone,
                appointmentId: appointment.id
            }

            // Send confirmation via preferred channels
            const preferences = donor.preferences as NotificationPreferences || {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            let success = true

            if (preferences.email && donor.email) {
                const emailSuccess = await EmailService.sendAppointmentConfirmation(emailData, donor.email)
                success = success && emailSuccess
            }

            if (preferences.push && donor.userId) {
                const pushSuccess = await this.sendPushNotification(donor.userId, {
                    title: 'Appointment Confirmed',
                    body: `Your donation appointment is confirmed for ${emailData.appointmentDate} at ${emailData.appointmentTime}`,
                    data: { appointmentId: appointment.id, type: 'confirmation' }
                })
                success = success && pushSuccess
            }

            console.log(`Confirmation sent for appointment ${appointment.id}`)
            return success
        } catch (error) {
            console.error(`Failed to send confirmation for appointment ${appointment.id}:`, error)
            return false
        }
    }

    // Send appointment cancellation notification
    static async sendAppointmentCancellation(appointment: AppointmentReminderData): Promise<boolean> {
        try {
            const { donor, bloodBank, appointmentDate } = appointment
            const appointmentDateObj = new Date(appointmentDate)

            // Prepare email data
            const emailData: AppointmentEmailData = {
                donorName: `${donor.firstName} ${donor.lastName}`,
                appointmentDate: appointmentDateObj.toLocaleDateString(),
                appointmentTime: appointmentDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                bloodBankName: bloodBank.name,
                bloodBankAddress: this.formatAddress(bloodBank.address),
                bloodBankPhone: bloodBank.phone,
                appointmentId: appointment.id
            }

            // Send cancellation notification
            const preferences = donor.preferences as NotificationPreferences || {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            let success = true

            if (preferences.email && donor.email) {
                const emailSuccess = await EmailService.sendAppointmentCancellation(emailData, donor.email)
                success = success && emailSuccess
            }

            if (preferences.push && donor.userId) {
                const pushSuccess = await this.sendPushNotification(donor.userId, {
                    title: 'Appointment Cancelled',
                    body: `Your appointment for ${emailData.appointmentDate} has been cancelled`,
                    data: { appointmentId: appointment.id, type: 'cancellation' }
                })
                success = success && pushSuccess
            }

            console.log(`Cancellation notification sent for appointment ${appointment.id}`)
            return success
        } catch (error) {
            console.error(`Failed to send cancellation notification for appointment ${appointment.id}:`, error)
            return false
        }
    }

    // Send emergency blood request notifications to eligible donors
    static async sendEmergencyBloodRequest(emergencyData: EmergencyNotificationData): Promise<boolean> {
        try {
            const { bloodType, urgencyLevel, facilityName, requestId, eligibleDonorIds } = emergencyData

            console.log(`Sending emergency ${bloodType} blood request to ${eligibleDonorIds.length} eligible donors`)

            let successCount = 0

            for (const donorId of eligibleDonorIds) {
                try {
                    // TODO: Fetch donor details from database
                    // const donor = await DonorService.getDonorById(donorId)

                    // Placeholder donor data for now
                    const donor = {
                        firstName: 'Donor',
                        lastName: 'Name',
                        email: 'donor@example.com',
                        preferences: { email: true, sms: false, push: true, reminderHours: 24 }
                    }

                    const emergencyEmailData: EmergencyRequestEmailData = {
                        donorName: `${donor.firstName} ${donor.lastName}`,
                        bloodType,
                        facilityName,
                        urgencyLevel,
                        requestId
                    }

                    const preferences = donor.preferences as NotificationPreferences

                    // Send emergency notification via email
                    if (preferences.email && donor.email) {
                        await EmailService.sendEmergencyRequest(emergencyEmailData, donor.email)
                    }

                    // Send push notification for immediate attention
                    if (preferences.push) {
                        await this.sendPushNotification(donorId, {
                            title: `🚨 URGENT: ${bloodType} Blood Needed`,
                            body: `${facilityName} urgently needs ${bloodType} blood. Can you help?`,
                            data: { requestId, bloodType, urgencyLevel, type: 'emergency' }
                        })
                    }

                    successCount++

                    // Small delay to avoid overwhelming services
                    await new Promise(resolve => setTimeout(resolve, 50))
                } catch (donorError) {
                    console.error(`Failed to send emergency notification to donor ${donorId}:`, donorError)
                }
            }

            console.log(`Emergency notifications sent to ${successCount}/${eligibleDonorIds.length} donors`)
            return successCount > 0
        } catch (error) {
            console.error('Failed to send emergency blood request notifications:', error)
            return false
        }
    }

    // Update notification preferences for a user
    static async updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<boolean> {
        try {
            // TODO: Update preferences in database
            console.log(`Updating notification preferences for user ${userId}:`, preferences)

            // Placeholder for database update
            /*
            await db.update(donorProfileSchema)
                .set({ preferences })
                .where(eq(donorProfileSchema.userId, userId))
            */

            return true
        } catch (error) {
            console.error('Failed to update notification preferences:', error)
            return false
        }
    }

    // Get notification preferences for a user
    static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
        try {
            // TODO: Fetch preferences from database
            console.log(`Fetching notification preferences for user ${userId}`)

            // Placeholder return default preferences
            return {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }
        } catch (error) {
            console.error('Failed to get notification preferences:', error)
            return null
        }
    }
}