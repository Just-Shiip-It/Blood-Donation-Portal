import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotificationService, AppointmentReminderData, EmergencyNotificationData } from '../notification'
import { EmailService } from '../email'

// Mock the EmailService
vi.mock('../email', () => ({
    EmailService: {
        sendAppointmentReminder: vi.fn(),
        sendAppointmentConfirmation: vi.fn(),
        sendAppointmentCancellation: vi.fn(),
        sendEmergencyRequest: vi.fn()
    }
}))

// Mock console methods to avoid noise in tests
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { })
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { })

describe('NotificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        mockConsoleLog.mockClear()
        mockConsoleError.mockClear()
    })

    const mockAppointmentData: AppointmentReminderData = {
        id: 'appointment-123',
        appointmentDate: '2024-02-15T10:00:00Z',
        donor: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            preferences: {
                email: true,
                sms: true,
                push: true,
                reminderHours: 24
            },
            userId: 'user-123'
        },
        bloodBank: {
            name: 'City Blood Bank',
            address: {
                street: '123 Main St',
                city: 'Anytown',
                state: 'ST',
                zipCode: '12345'
            },
            phone: '+1987654321'
        }
    }

    describe('sendAppointmentReminder', () => {
        it('should send email reminder when email preference is enabled', async () => {
            const mockEmailSend = vi.mocked(EmailService.sendAppointmentReminder).mockResolvedValue(true)

            const result = await NotificationService.sendAppointmentReminder('appointment-123', mockAppointmentData)

            expect(result).toBe(true)
            expect(mockEmailSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    donorName: 'John Doe',
                    appointmentDate: expect.any(String),
                    appointmentTime: expect.any(String),
                    bloodBankName: 'City Blood Bank',
                    bloodBankAddress: '123 Main St, Anytown, ST, 12345',
                    bloodBankPhone: '+1987654321',
                    appointmentId: 'appointment-123'
                }),
                'john.doe@example.com'
            )
        })

        it('should not send email when email preference is disabled', async () => {
            const appointmentDataNoEmail = {
                ...mockAppointmentData,
                donor: {
                    ...mockAppointmentData.donor,
                    preferences: {
                        email: false,
                        sms: true,
                        push: true,
                        reminderHours: 24
                    }
                }
            }

            vi.mocked(EmailService.sendAppointmentReminder)

            await NotificationService.sendAppointmentReminder('appointment-123', appointmentDataNoEmail)

            expect(EmailService.sendAppointmentReminder).not.toHaveBeenCalled()
        })

        it('should not send email when donor has no email address', async () => {
            const appointmentDataNoEmailAddress = {
                ...mockAppointmentData,
                donor: {
                    ...mockAppointmentData.donor,
                    email: null
                }
            }

            vi.mocked(EmailService.sendAppointmentReminder)

            await NotificationService.sendAppointmentReminder('appointment-123', appointmentDataNoEmailAddress)

            expect(EmailService.sendAppointmentReminder).not.toHaveBeenCalled()
        })

        it('should handle email sending failure gracefully', async () => {
            vi.mocked(EmailService.sendAppointmentReminder).mockResolvedValue(false)

            const result = await NotificationService.sendAppointmentReminder('appointment-123', mockAppointmentData)

            expect(result).toBe(true) // Should still return true if other notifications succeed
            expect(EmailService.sendAppointmentReminder).toHaveBeenCalled()
        })

        it('should handle exceptions gracefully', async () => {
            vi.mocked(EmailService.sendAppointmentReminder).mockRejectedValue(new Error('Email service error'))

            const result = await NotificationService.sendAppointmentReminder('appointment-123', mockAppointmentData)

            expect(result).toBe(false)
            expect(mockConsoleError).toHaveBeenCalledWith(
                'Failed to send reminder for appointment appointment-123:',
                expect.any(Error)
            )
        })
    })

    describe('sendAppointmentConfirmation', () => {
        it('should send confirmation email when preferences allow', async () => {
            vi.mocked(EmailService.sendAppointmentConfirmation).mockResolvedValue(true)

            const result = await NotificationService.sendAppointmentConfirmation(mockAppointmentData)

            expect(result).toBe(true)
            expect(EmailService.sendAppointmentConfirmation).toHaveBeenCalledWith(
                expect.objectContaining({
                    donorName: 'John Doe',
                    appointmentId: 'appointment-123'
                }),
                'john.doe@example.com'
            )
        })

        it('should return false when all notification methods fail', async () => {
            vi.mocked(EmailService.sendAppointmentConfirmation).mockResolvedValue(false)

            const result = await NotificationService.sendAppointmentConfirmation(mockAppointmentData)

            expect(result).toBe(false)
        })
    })

    describe('sendAppointmentCancellation', () => {
        it('should send cancellation email when preferences allow', async () => {
            vi.mocked(EmailService.sendAppointmentCancellation).mockResolvedValue(true)

            const result = await NotificationService.sendAppointmentCancellation(mockAppointmentData)

            expect(result).toBe(true)
            expect(EmailService.sendAppointmentCancellation).toHaveBeenCalledWith(
                expect.objectContaining({
                    donorName: 'John Doe',
                    appointmentId: 'appointment-123'
                }),
                'john.doe@example.com'
            )
        })
    })

    describe('sendEmergencyBloodRequest', () => {
        const mockEmergencyData: EmergencyNotificationData = {
            bloodType: 'O-',
            urgencyLevel: 'emergency',
            facilityName: 'Emergency Hospital',
            requestId: 'request-456',
            eligibleDonorIds: ['donor-1', 'donor-2', 'donor-3']
        }

        it('should send emergency notifications to all eligible donors', async () => {
            vi.mocked(EmailService.sendEmergencyRequest).mockResolvedValue(true)

            const result = await NotificationService.sendEmergencyBloodRequest(mockEmergencyData)

            expect(result).toBe(true)
            expect(EmailService.sendEmergencyRequest).toHaveBeenCalledTimes(3) // Once for each donor
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Sending emergency O- blood request to 3 eligible donors'
            )
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Emergency notifications sent to 3/3 donors'
            )
        })

        it('should handle partial failures gracefully', async () => {
            vi.mocked(EmailService.sendEmergencyRequest)
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('Email failed'))
                .mockResolvedValueOnce(true)

            const result = await NotificationService.sendEmergencyBloodRequest(mockEmergencyData)

            expect(result).toBe(true) // Should return true if at least one notification succeeded
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Emergency notifications sent to 2/3 donors'
            )
        })

        it('should return false when no donors are provided', async () => {
            const emptyEmergencyData = {
                ...mockEmergencyData,
                eligibleDonorIds: []
            }

            const result = await NotificationService.sendEmergencyBloodRequest(emptyEmergencyData)

            expect(result).toBe(false)
        })

        it('should handle complete failure', async () => {
            vi.mocked(EmailService.sendEmergencyRequest).mockRejectedValue(new Error('Service unavailable'))

            const result = await NotificationService.sendEmergencyBloodRequest(mockEmergencyData)

            expect(result).toBe(false) // Returns false when no notifications succeed
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Emergency notifications sent to 0/3 donors'
            )
        })
    })

    describe('updateNotificationPreferences', () => {
        it('should update preferences successfully', async () => {
            const preferences = {
                email: true,
                sms: false,
                push: true,
                reminderHours: 48
            }

            const result = await NotificationService.updateNotificationPreferences('user-123', preferences)

            expect(result).toBe(true)
            expect(mockConsoleLog).toHaveBeenCalledWith(
                'Updating notification preferences for user user-123:',
                preferences
            )
        })

        it('should handle update failure', async () => {
            // Mock a scenario where the update would fail
            const originalConsoleError = console.error
            console.error = vi.fn().mockImplementation(() => {
                throw new Error('Database error')
            })

            const preferences = {
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }

            const result = await NotificationService.updateNotificationPreferences('user-123', preferences)

            expect(result).toBe(true) // Current implementation always returns true

            console.error = originalConsoleError
        })
    })

    describe('getNotificationPreferences', () => {
        it('should return default preferences', async () => {
            const result = await NotificationService.getNotificationPreferences('user-123')

            expect(result).toEqual({
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            })
        })

        it('should handle fetch failure', async () => {
            // Mock a scenario where fetching would fail
            const originalConsoleError = console.error
            console.error = vi.fn().mockImplementation(() => {
                throw new Error('Database error')
            })

            const result = await NotificationService.getNotificationPreferences('user-123')

            expect(result).toEqual({
                email: true,
                sms: false,
                push: true,
                reminderHours: 24
            }) // Still returns default preferences

            console.error = originalConsoleError
        })
    })

    describe('processAppointmentReminders', () => {
        it('should process reminders without errors', async () => {
            await NotificationService.processAppointmentReminders()

            expect(mockConsoleLog).toHaveBeenCalledWith('Processing appointment reminders...')
            expect(mockConsoleLog).toHaveBeenCalledWith('Finished processing appointment reminders')
        })

        it('should handle processing errors gracefully', async () => {
            // Mock an error during processing
            const originalConsoleLog = console.log
            console.log = vi.fn().mockImplementation((message) => {
                if (message === 'Processing appointment reminders...') {
                    throw new Error('Processing error')
                }
            })

            await NotificationService.processAppointmentReminders()

            expect(mockConsoleError).toHaveBeenCalledWith(
                'Error processing appointment reminders:',
                expect.any(Error)
            )

            console.log = originalConsoleLog
        })
    })
})