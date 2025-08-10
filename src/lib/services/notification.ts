/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppointmentService } from './appointment'

interface AppointmentReminderData {
    id: string
    appointmentDate: string
    donor: {
        firstName: string
        lastName: string
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
            const reminderMessage = this.generateReminderMessage(appointment)

            // Send email reminder if enabled
            if (preferences.email) {
                await this.sendEmailReminder(donor, bloodBank, appointmentDate, reminderMessage)
            }

            // Send SMS reminder if enabled and phone number available
            if (preferences.sms && donor.phone) {
                await this.sendSMSReminder(donor.phone, reminderMessage)
            }

            // Send push notification if enabled
            if (preferences.push && donor.userId) {
                await this.sendPushNotification(donor.userId, reminderMessage)
            }

            // Mark reminder as sent
            await AppointmentService.markReminderSent(appointmentId)

            console.log(`Reminder sent for appointment ${appointmentId}`)
        } catch (error) {
            console.error(`Failed to send reminder for appointment ${appointmentId}:`, error)
        }
    }

    // Generate reminder message
    private static generateReminderMessage(appointment: AppointmentReminderData): string {
        const { donor, bloodBank, appointmentDate } = appointment
        const date = new Date(appointmentDate).toLocaleDateString()
        const time = new Date(appointmentDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })

        const address = bloodBank.address as { street?: string; city?: string } || {}
        return `Hi ${donor.firstName}, this is a reminder that you have a blood donation appointment tomorrow at ${time} at ${bloodBank.name}. Address: ${address.street || ''}, ${address.city || ''}. Please arrive 15 minutes early. Thank you for your donation!`
    }

    // Send email reminder (placeholder - integrate with email service)
    private static async sendEmailReminder(
        donor: { firstName: string; lastName: string; email?: string },
        bloodBank: { name: string; address: { street?: string; city?: string } | unknown; phone: string },
        appointmentDate: Date,
        message: string
    ) {
        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        console.log('Email reminder would be sent to:', donor.email || 'No email available')
        console.log('Message:', message)

        // Example integration with email service:
        /*
        const emailData = {
          to: donor.email,
          subject: 'Blood Donation Appointment Reminder',
          html: `
            <h2>Appointment Reminder</h2>
            <p>Dear ${donor.firstName} ${donor.lastName},</p>
            <p>${message}</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
              <h3>Appointment Details:</h3>
              <p><strong>Date:</strong> ${appointmentDate.toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${appointmentDate.toLocaleTimeString()}</p>
              <p><strong>Location:</strong> ${bloodBank.name}</p>
              <p><strong>Address:</strong> ${bloodBank.address.street}, ${bloodBank.address.city}</p>
              <p><strong>Phone:</strong> ${bloodBank.phone}</p>
            </div>
            <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            <p>Thank you for your life-saving donation!</p>
          `
        }
        
        await emailService.send(emailData)
        */
    }

    // Send SMS reminder (placeholder - integrate with SMS service)
    private static async sendSMSReminder(phoneNumber: string, message: string) {
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
        console.log('SMS reminder would be sent to:', phoneNumber)
        console.log('Message:', message)

        // Example integration with Twilio:
        /*
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        })
        */
    }

    // Send push notification (placeholder - integrate with push service)
    private static async sendPushNotification(userId: string, message: string) {
        // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
        console.log('Push notification would be sent to user:', userId)
        console.log('Message:', message)

        // Example integration with Firebase:
        /*
        const payload = {
          notification: {
            title: 'Blood Donation Reminder',
            body: message,
            icon: '/icon-192x192.png'
          }
        }
        
        await admin.messaging().sendToTopic(`user_${userId}`, payload)
        */
    }

    // Process all pending reminders (to be called by cron job)
    static async processAppointmentReminders() {
        try {
            const appointmentsForReminders = await AppointmentService.getAppointmentsForReminders()

            console.log(`Processing ${appointmentsForReminders.length} appointment reminders`)

            for (const appointment of appointmentsForReminders) {
                // Convert Date to string for the reminder function
                const appointmentData = {
                    ...appointment,
                    appointmentDate: appointment.appointmentDate.toISOString()
                }
                await this.sendAppointmentReminder(appointment.id, appointmentData)

                // Add small delay to avoid overwhelming services
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            console.log('Finished processing appointment reminders')
        } catch (error) {
            console.error('Error processing appointment reminders:', error)
        }
    }

    // Send appointment confirmation
    static async sendAppointmentConfirmation(appointment: AppointmentReminderData) {
        try {
            const { donor, bloodBank, appointmentDate } = appointment
            const date = new Date(appointmentDate).toLocaleDateString()
            const time = new Date(appointmentDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })

            const confirmationMessage = `Your blood donation appointment has been confirmed for ${date} at ${time} at ${bloodBank.name}. We'll send you a reminder 24 hours before your appointment. Thank you for your commitment to saving lives!`

            // Send confirmation via preferred channels
            const preferences = donor.preferences as NotificationPreferences || {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            if (preferences.email) {
                await this.sendEmailReminder(donor, bloodBank, new Date(appointmentDate), confirmationMessage)
            }

            if (preferences.push && donor.userId) {
                await this.sendPushNotification(donor.userId, confirmationMessage)
            }

            console.log(`Confirmation sent for appointment ${appointment.id}`)
        } catch (error) {
            console.error(`Failed to send confirmation for appointment ${appointment.id}:`, error)
        }
    }

    // Send appointment cancellation notification
    static async sendAppointmentCancellation(appointment: AppointmentReminderData) {
        try {
            const { donor, bloodBank, appointmentDate } = appointment
            const date = new Date(appointmentDate).toLocaleDateString()
            const time = new Date(appointmentDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })

            const cancellationMessage = `Your blood donation appointment scheduled for ${date} at ${time} at ${bloodBank.name} has been cancelled. You can book a new appointment anytime through our portal. Thank you for your understanding.`

            // Send cancellation notification
            const preferences = donor.preferences as NotificationPreferences || {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            if (preferences.email) {
                await this.sendEmailReminder(donor, bloodBank, new Date(appointmentDate), cancellationMessage)
            }

            if (preferences.push && donor.userId) {
                await this.sendPushNotification(donor.userId, cancellationMessage)
            }

            console.log(`Cancellation notification sent for appointment ${appointment.id}`)
        } catch (error) {
            console.error(`Failed to send cancellation notification for appointment ${appointment.id}:`, error)
        }
    }
}