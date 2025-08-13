import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface EmailTemplate {
    subject: string
    html: string
    text: string
}

export interface EmailData {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
}

export interface AppointmentEmailData {
    donorName: string
    appointmentDate: string
    appointmentTime: string
    bloodBankName: string
    bloodBankAddress: string
    bloodBankPhone: string
    appointmentId: string
}

export interface EmergencyRequestEmailData {
    donorName: string
    bloodType: string
    facilityName: string
    urgencyLevel: string
    requestId: string
}

export class EmailService {
    private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@blooddonationportal.com'

    // Email templates
    static getAppointmentConfirmationTemplate(data: AppointmentEmailData): EmailTemplate {
        const subject = 'Blood Donation Appointment Confirmed'
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .appointment-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Confirmed</h1>
            </div>
            <div class="content">
              <p>Dear ${data.donorName},</p>
              <p>Thank you for scheduling your blood donation appointment. Your commitment to saving lives is truly appreciated!</p>
              
              <div class="appointment-details">
                <h3>Appointment Details</h3>
                <p><strong>Date:</strong> ${data.appointmentDate}</p>
                <p><strong>Time:</strong> ${data.appointmentTime}</p>
                <p><strong>Location:</strong> ${data.bloodBankName}</p>
                <p><strong>Address:</strong> ${data.bloodBankAddress}</p>
                <p><strong>Phone:</strong> ${data.bloodBankPhone}</p>
              </div>
              
              <p><strong>Important Reminders:</strong></p>
              <ul>
                <li>Please arrive 15 minutes early for check-in</li>
                <li>Bring a valid photo ID</li>
                <li>Eat a healthy meal and stay hydrated before your appointment</li>
                <li>Get a good night's sleep before donating</li>
              </ul>
              
              <p>We'll send you a reminder 24 hours before your appointment.</p>
              
              <div class="footer">
                <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
                <p>Thank you for your life-saving donation!</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

        const text = `
      Dear ${data.donorName},
      
      Your blood donation appointment has been confirmed!
      
      Appointment Details:
      Date: ${data.appointmentDate}
      Time: ${data.appointmentTime}
      Location: ${data.bloodBankName}
      Address: ${data.bloodBankAddress}
      Phone: ${data.bloodBankPhone}
      
      Important Reminders:
      - Please arrive 15 minutes early for check-in
      - Bring a valid photo ID
      - Eat a healthy meal and stay hydrated before your appointment
      - Get a good night's sleep before donating
      
      We'll send you a reminder 24 hours before your appointment.
      
      If you need to reschedule or cancel, please contact us as soon as possible.
      Thank you for your life-saving donation!
    `

        return { subject, html, text }
    }

    static getAppointmentReminderTemplate(data: AppointmentEmailData): EmailTemplate {
        const subject = 'Blood Donation Appointment Reminder - Tomorrow'
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .appointment-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .reminder-badge { background-color: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🩸 Appointment Reminder</h1>
            </div>
            <div class="content">
              <div class="reminder-badge">Tomorrow's Appointment</div>
              <p>Hi ${data.donorName},</p>
              <p>This is a friendly reminder that you have a blood donation appointment tomorrow!</p>
              
              <div class="appointment-details">
                <h3>Your Appointment</h3>
                <p><strong>Date:</strong> ${data.appointmentDate}</p>
                <p><strong>Time:</strong> ${data.appointmentTime}</p>
                <p><strong>Location:</strong> ${data.bloodBankName}</p>
                <p><strong>Address:</strong> ${data.bloodBankAddress}</p>
                <p><strong>Phone:</strong> ${data.bloodBankPhone}</p>
              </div>
              
              <p><strong>Pre-Donation Checklist:</strong></p>
              <ul>
                <li>✅ Eat a healthy meal 2-3 hours before donating</li>
                <li>✅ Drink plenty of water (avoid alcohol)</li>
                <li>✅ Get a good night's sleep</li>
                <li>✅ Bring a valid photo ID</li>
                <li>✅ Arrive 15 minutes early</li>
              </ul>
              
              <p>Your donation can save up to 3 lives. Thank you for being a hero!</p>
            </div>
          </div>
        </body>
      </html>
    `

        const text = `
      Hi ${data.donorName},
      
      This is a friendly reminder that you have a blood donation appointment tomorrow!
      
      Your Appointment:
      Date: ${data.appointmentDate}
      Time: ${data.appointmentTime}
      Location: ${data.bloodBankName}
      Address: ${data.bloodBankAddress}
      Phone: ${data.bloodBankPhone}
      
      Pre-Donation Checklist:
      - Eat a healthy meal 2-3 hours before donating
      - Drink plenty of water (avoid alcohol)
      - Get a good night's sleep
      - Bring a valid photo ID
      - Arrive 15 minutes early
      
      Your donation can save up to 3 lives. Thank you for being a hero!
    `

        return { subject, html, text }
    }

    static getEmergencyRequestTemplate(data: EmergencyRequestEmailData): EmailTemplate {
        const subject = `🚨 URGENT: ${data.bloodType} Blood Needed`
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .urgent-banner { background-color: #fef2f2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .blood-type { font-size: 24px; font-weight: bold; color: #dc2626; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 URGENT BLOOD NEEDED</h1>
            </div>
            <div class="content">
              <div class="urgent-banner">
                <div class="blood-type">${data.bloodType} Blood Type Needed</div>
                <p><strong>Urgency Level: ${data.urgencyLevel.toUpperCase()}</strong></p>
              </div>
              
              <p>Dear ${data.donorName},</p>
              <p>We urgently need your help! ${data.facilityName} has requested ${data.bloodType} blood for a patient in need.</p>
              
              <p><strong>Your ${data.bloodType} blood type is critically needed right now.</strong></p>
              
              <p>Every minute counts when it comes to saving lives. If you're eligible to donate, please consider scheduling an emergency appointment as soon as possible.</p>
              
              <a href="#" class="button">Schedule Emergency Donation</a>
              
              <p><strong>Quick Eligibility Check:</strong></p>
              <ul>
                <li>It's been at least 56 days since your last donation</li>
                <li>You're feeling healthy and well</li>
                <li>You've had adequate sleep and nutrition</li>
              </ul>
              
              <p>Thank you for being a lifesaver. Your donation can make the difference between life and death.</p>
              
              <p><em>If you cannot donate at this time, please consider sharing this message with friends and family who might be able to help.</em></p>
            </div>
          </div>
        </body>
      </html>
    `

        const text = `
      🚨 URGENT BLOOD NEEDED
      
      Dear ${data.donorName},
      
      We urgently need your help! ${data.facilityName} has requested ${data.bloodType} blood for a patient in need.
      
      Your ${data.bloodType} blood type is critically needed right now.
      Urgency Level: ${data.urgencyLevel.toUpperCase()}
      
      Every minute counts when it comes to saving lives. If you're eligible to donate, please consider scheduling an emergency appointment as soon as possible.
      
      Quick Eligibility Check:
      - It's been at least 56 days since your last donation
      - You're feeling healthy and well
      - You've had adequate sleep and nutrition
      
      Thank you for being a lifesaver. Your donation can make the difference between life and death.
      
      If you cannot donate at this time, please consider sharing this message with friends and family who might be able to help.
    `

        return { subject, html, text }
    }

    static getAppointmentCancellationTemplate(data: AppointmentEmailData): EmailTemplate {
        const subject = 'Blood Donation Appointment Cancelled'
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .cancelled-details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
              <p>Dear ${data.donorName},</p>
              <p>We regret to inform you that your blood donation appointment has been cancelled.</p>
              
              <div class="cancelled-details">
                <h3>Cancelled Appointment Details</h3>
                <p><strong>Date:</strong> ${data.appointmentDate}</p>
                <p><strong>Time:</strong> ${data.appointmentTime}</p>
                <p><strong>Location:</strong> ${data.bloodBankName}</p>
              </div>
              
              <p>We apologize for any inconvenience this may cause. You can book a new appointment anytime through our portal.</p>
              
              <a href="#" class="button">Book New Appointment</a>
              
              <p>Thank you for your understanding and continued commitment to saving lives.</p>
            </div>
          </div>
        </body>
      </html>
    `

        const text = `
      Dear ${data.donorName},
      
      We regret to inform you that your blood donation appointment has been cancelled.
      
      Cancelled Appointment Details:
      Date: ${data.appointmentDate}
      Time: ${data.appointmentTime}
      Location: ${data.bloodBankName}
      
      We apologize for any inconvenience this may cause. You can book a new appointment anytime through our portal.
      
      Thank you for your understanding and continued commitment to saving lives.
    `

        return { subject, html, text }
    }

    // Send email using Supabase Edge Functions or external service
    static async sendEmail(emailData: EmailData): Promise<boolean> {
        try {
            // In a real implementation, you would integrate with an email service
            // For now, we'll use Supabase Edge Functions or a service like SendGrid

            // Example with Supabase Edge Functions
            const cookieStore = await cookies()
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll()
                        },
                        setAll(cookiesToSet) {
                            try {
                                cookiesToSet.forEach(({ name, value, options }) =>
                                    cookieStore.set(name, value, options)
                                )
                            } catch {
                                // The `setAll` method was called from a Server Component.
                                // This can be ignored if you have middleware refreshing
                                // user sessions.
                            }
                        },
                    },
                }
            )

            // Call Supabase Edge Function for email sending
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    text: emailData.text,
                    from: emailData.from || this.FROM_EMAIL
                }
            })

            if (error) {
                console.error('Email sending error:', error)
                return false
            }

            console.log('Email sent successfully:', data)
            return true
        } catch (error) {
            console.error('Failed to send email:', error)
            return false
        }
    }

    // Send appointment confirmation email
    static async sendAppointmentConfirmation(data: AppointmentEmailData, recipientEmail: string): Promise<boolean> {
        const template = this.getAppointmentConfirmationTemplate(data)
        return this.sendEmail({
            to: recipientEmail,
            subject: template.subject,
            html: template.html,
            text: template.text
        })
    }

    // Send appointment reminder email
    static async sendAppointmentReminder(data: AppointmentEmailData, recipientEmail: string): Promise<boolean> {
        const template = this.getAppointmentReminderTemplate(data)
        return this.sendEmail({
            to: recipientEmail,
            subject: template.subject,
            html: template.html,
            text: template.text
        })
    }

    // Send emergency blood request email
    static async sendEmergencyRequest(data: EmergencyRequestEmailData, recipientEmail: string): Promise<boolean> {
        const template = this.getEmergencyRequestTemplate(data)
        return this.sendEmail({
            to: recipientEmail,
            subject: template.subject,
            html: template.html,
            text: template.text
        })
    }

    // Send appointment cancellation email
    static async sendAppointmentCancellation(data: AppointmentEmailData, recipientEmail: string): Promise<boolean> {
        const template = this.getAppointmentCancellationTemplate(data)
        return this.sendEmail({
            to: recipientEmail,
            subject: template.subject,
            html: template.html,
            text: template.text
        })
    }
}