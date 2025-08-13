export interface SMSData {
    to: string
    message: string
    urgency?: 'normal' | 'urgent' | 'emergency'
}

export interface AppointmentSMSData {
    donorName: string
    appointmentDate: string
    appointmentTime: string
    bloodBankName: string
    appointmentId: string
}

export interface EmergencyRequestSMSData {
    donorName: string
    bloodType: string
    facilityName: string
    urgencyLevel: string
}

export class SMSService {
    private static readonly MAX_SMS_LENGTH = 160

    // Generate appointment confirmation SMS
    static generateAppointmentConfirmationSMS(data: AppointmentSMSData): string {
        return `Hi ${data.donorName}! Your blood donation appointment is confirmed for ${data.appointmentDate} at ${data.appointmentTime} at ${data.bloodBankName}. Please arrive 15 minutes early. Thank you for saving lives!`
    }

    // Generate appointment reminder SMS
    static generateAppointmentReminderSMS(data: AppointmentSMSData): string {
        return `🩸 Reminder: You have a blood donation appointment tomorrow at ${data.appointmentTime} at ${data.bloodBankName}. Please arrive 15 minutes early with ID. Thank you!`
    }

    // Generate emergency blood request SMS
    static generateEmergencyRequestSMS(data: EmergencyRequestSMSData): string {
        return `🚨 URGENT: ${data.bloodType} blood needed at ${data.facilityName}! Your donation can save a life. Please consider scheduling an emergency appointment if eligible. Every minute counts!`
    }

    // Generate appointment cancellation SMS
    static generateAppointmentCancellationSMS(data: AppointmentSMSData): string {
        return `Your blood donation appointment on ${data.appointmentDate} at ${data.appointmentTime} has been cancelled. You can book a new appointment anytime. Thank you for understanding.`
    }

    // Generate eligibility reminder SMS
    static generateEligibilityReminderSMS(donorName: string, nextEligibleDate: string): string {
        return `Hi ${donorName}! You're eligible to donate blood again starting ${nextEligibleDate}. Book your next life-saving appointment today!`
    }

    // Truncate message if too long
    private static truncateMessage(message: string, maxLength: number = this.MAX_SMS_LENGTH): string {
        if (message.length <= maxLength) {
            return message
        }

        // Try to truncate at word boundary
        const truncated = message.substring(0, maxLength - 3)
        const lastSpace = truncated.lastIndexOf(' ')

        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...'
        }

        return truncated + '...'
    }

    // Send SMS using external service (Twilio, AWS SNS, etc.)
    static async sendSMS(smsData: SMSData): Promise<boolean> {
        try {
            // Truncate message if necessary
            const message = this.truncateMessage(smsData.message)

            // In a real implementation, integrate with SMS service
            // Example with Twilio:
            /*
            const twilio = require('twilio')
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
            
            const result = await client.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: smsData.to
            })
            
            console.log('SMS sent successfully:', result.sid)
            return true
            */

            // Example with AWS SNS:
            /*
            const AWS = require('aws-sdk')
            const sns = new AWS.SNS({
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION
            })
            
            const params = {
              Message: message,
              PhoneNumber: smsData.to,
              MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                  DataType: 'String',
                  StringValue: smsData.urgency === 'emergency' ? 'Transactional' : 'Promotional'
                }
              }
            }
            
            const result = await sns.publish(params).promise()
            console.log('SMS sent successfully:', result.MessageId)
            return true
            */

            // For development/testing - log the SMS
            console.log('SMS would be sent to:', smsData.to)
            console.log('Message:', message)
            console.log('Urgency:', smsData.urgency || 'normal')

            // Simulate successful sending
            return true
        } catch (error) {
            console.error('Failed to send SMS:', error)
            return false
        }
    }

    // Send appointment confirmation SMS
    static async sendAppointmentConfirmation(data: AppointmentSMSData, phoneNumber: string): Promise<boolean> {
        const message = this.generateAppointmentConfirmationSMS(data)
        return this.sendSMS({
            to: phoneNumber,
            message,
            urgency: 'normal'
        })
    }

    // Send appointment reminder SMS
    static async sendAppointmentReminder(data: AppointmentSMSData, phoneNumber: string): Promise<boolean> {
        const message = this.generateAppointmentReminderSMS(data)
        return this.sendSMS({
            to: phoneNumber,
            message,
            urgency: 'normal'
        })
    }

    // Send emergency blood request SMS
    static async sendEmergencyRequest(data: EmergencyRequestSMSData, phoneNumber: string): Promise<boolean> {
        const message = this.generateEmergencyRequestSMS(data)
        return this.sendSMS({
            to: phoneNumber,
            message,
            urgency: 'emergency'
        })
    }

    // Send appointment cancellation SMS
    static async sendAppointmentCancellation(data: AppointmentSMSData, phoneNumber: string): Promise<boolean> {
        const message = this.generateAppointmentCancellationSMS(data)
        return this.sendSMS({
            to: phoneNumber,
            message,
            urgency: 'normal'
        })
    }

    // Send eligibility reminder SMS
    static async sendEligibilityReminder(donorName: string, phoneNumber: string, nextEligibleDate: string): Promise<boolean> {
        const message = this.generateEligibilityReminderSMS(donorName, nextEligibleDate)
        return this.sendSMS({
            to: phoneNumber,
            message,
            urgency: 'normal'
        })
    }

    // Validate phone number format
    static validatePhoneNumber(phoneNumber: string): boolean {
        // Basic phone number validation (E.164 format)
        const phoneRegex = /^\+[1-9]\d{1,14}$/
        return phoneRegex.test(phoneNumber)
    }

    // Format phone number to E.164 format
    static formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
        // Remove all non-digit characters
        const digits = phoneNumber.replace(/\D/g, '')

        // If it starts with country code, return as is
        if (digits.length === 11 && digits.startsWith('1')) {
            return '+' + digits
        }

        // If it's a 10-digit US number, add country code
        if (digits.length === 10) {
            return countryCode + digits
        }

        // Return original if can't format
        return phoneNumber
    }
}