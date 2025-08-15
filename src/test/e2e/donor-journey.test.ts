import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'
import { POST as registerPost } from '@/app/api/auth/register/route'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { GET as profileGet } from '@/app/api/auth/profile/route'
import { POST as appointmentsPost, GET as appointmentsGet } from '@/app/api/appointments/route'
import { GET as availabilityGet } from '@/app/api/appointments/availability/route'
import { GET as donationsGet } from '@/app/api/donations/route'
import { GET as eligibilityGet } from '@/app/api/donors/eligibility/route'

describe('Donor User Journey E2E Tests', () => {
    let testManager: TestDataManager
    let testBloodBank: any

    beforeEach(async () => {
        testManager = new TestDataManager()

        // Create test blood bank for appointments
        testBloodBank = await testManager.createTestBloodBank({
            name: 'City Blood Bank',
            capacity: 25
        })

        // Create inventory
        await testManager.createTestInventory(testBloodBank.id, {
            bloodType: 'O+',
            unitsAvailable: 100
        })
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('Complete Donor Registration and First Donation Journey', () => {
        it('should complete full donor onboarding and appointment booking flow', async () => {
            // Step 1: Register as new donor
            const registrationData = {
                email: 'newdonor@example.com',
                password: 'SecurePass123!',
                role: 'donor',
                profile: {
                    firstName: 'John',
                    lastName: 'Donor',
                    dateOfBirth: '1985-03-15',
                    bloodType: 'O+',
                    phone: '555-0123',
                    address: {
                        street: '123 Main St',
                        city: 'Test City',
                        state: 'TS',
                        zipCode: '12345'
                    },
                    medicalHistory: {
                        allergies: [],
                        medications: [],
                        conditions: []
                    },
                    emergencyContact: {
                        name: 'Jane Donor',
                        phone: '555-0124',
                        relationship: 'Spouse'
                    }
                }
            }

            const registerRequest = createMockRequest('POST', '/api/auth/register', registrationData)
            const registerResponse = await registerPost(registerRequest)
            const registerData = await registerResponse.json()

            expect(registerResponse.status).toBe(201)
            expect(registerData.success).toBe(true)
            expect(registerData.data.user.email).toBe(registrationData.email)
            expect(registerData.data.profile.firstName).toBe(registrationData.profile.firstName)

            // Step 2: Login with new credentials
            const loginData = {
                email: 'newdonor@example.com',
                password: 'SecurePass123!'
            }

            const loginRequest = createMockRequest('POST', '/api/auth/login', loginData)
            const loginResponse = await loginPost(loginRequest)
            const loginResult = await loginResponse.json()

            expect(loginResponse.status).toBe(200)
            expect(loginResult.success).toBe(true)
            expect(loginResult.data.session.accessToken).toBeDefined()

            // Step 3: Get profile to verify complete registration
            const headers = await getAuthHeaders('newdonor@example.com', 'SecurePass123!')
            const profileRequest = createMockRequest('GET', '/api/auth/profile', undefined, headers)
            const profileResponse = await profileGet(profileRequest)
            const profileData = await profileResponse.json()

            expect(profileResponse.status).toBe(200)
            expect(profileData.success).toBe(true)
            expect(profileData.data.profile.firstName).toBe('John')
            expect(profileData.data.profile.bloodType).toBe('O+')

            // Step 4: Check eligibility for donation
            const eligibilityRequest = createMockRequest('GET', '/api/donors/eligibility', undefined, headers)
            const eligibilityResponse = await eligibilityGet(eligibilityRequest)
            const eligibilityData = await eligibilityResponse.json()

            expect(eligibilityResponse.status).toBe(200)
            expect(eligibilityData.success).toBe(true)
            expect(eligibilityData.data.eligible).toBe(true)
            expect(eligibilityData.data.nextEligibleDate).toBeNull()

            // Step 5: Check available appointment slots
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 14)

            const availabilityRequest = createMockRequest(
                'GET',
                `/api/appointments/availability?bloodBankId=${testBloodBank.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                undefined,
                headers
            )
            const availabilityResponse = await availabilityGet(availabilityRequest)
            const availabilityData = await availabilityResponse.json()

            expect(availabilityResponse.status).toBe(200)
            expect(availabilityData.success).toBe(true)
            expect(availabilityData.data.length).toBeGreaterThan(0)

            // Step 6: Book first appointment
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7) // Next week
            appointmentDate.setHours(10, 0, 0, 0) // 10 AM

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
                notes: 'First time donor - excited to help!'
            }

            const appointmentRequest = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const appointmentResponse = await appointmentsPost(appointmentRequest)
            const appointmentResult = await appointmentResponse.json()

            expect(appointmentResponse.status).toBe(200)
            expect(appointmentResult.success).toBe(true)
            expect(appointmentResult.data.status).toBe('scheduled')
            expect(appointmentResult.data.notes).toBe(appointmentData.notes)

            // Step 7: Verify appointment appears in donor's appointments
            const myAppointmentsRequest = createMockRequest('GET', '/api/appointments?status=scheduled', undefined, headers)
            const myAppointmentsResponse = await appointmentsGet(myAppointmentsRequest)
            const myAppointmentsData = await myAppointmentsResponse.json()

            expect(myAppointmentsResponse.status).toBe(200)
            expect(myAppointmentsData.success).toBe(true)
            expect(myAppointmentsData.data).toHaveLength(1)
            expect(myAppointmentsData.data[0].bloodBank.name).toBe(testBloodBank.name)

            // Step 8: Check donation history (should be empty for new donor)
            const donationHistoryRequest = createMockRequest('GET', '/api/donations', undefined, headers)
            const donationHistoryResponse = await donationsGet(donationHistoryRequest)
            const donationHistoryData = await donationHistoryResponse.json()

            expect(donationHistoryResponse.status).toBe(200)
            expect(donationHistoryData.success).toBe(true)
            expect(donationHistoryData.data).toHaveLength(0) // No donations yet
        })

        it('should handle returning donor with donation history', async () => {
            // Create returning donor with previous donation
            const { user } = await testManager.createTestUser({
                email: 'returning@donor.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const lastDonationDate = new Date()
            lastDonationDate.setDate(lastDonationDate.getDate() - 60) // 60 days ago

            const donor = await testManager.createTestDonor(user.id, {
                firstName: 'Returning',
                lastName: 'Donor',
                bloodType: 'O+',
                lastDonationDate: lastDonationDate.toISOString().split('T')[0],
                totalDonations: 3
            })

            // Create donation history
            await testManager.testSupabase
                .from('donation_history')
                .insert([
                    {
                        donor_id: donor.id,
                        blood_bank_id: testBloodBank.id,
                        donation_date: lastDonationDate.toISOString(),
                        blood_type: 'O+',
                        units_donated: 1,
                        hemoglobin_level: 14.5,
                        blood_pressure_systolic: 120,
                        blood_pressure_diastolic: 80,
                        status: 'completed'
                    }
                ])

            // Login and check eligibility
            const headers = await getAuthHeaders('returning@donor.com', 'SecurePass123!')

            const eligibilityRequest = createMockRequest('GET', '/api/donors/eligibility', undefined, headers)
            const eligibilityResponse = await eligibilityGet(eligibilityRequest)
            const eligibilityData = await eligibilityResponse.json()

            expect(eligibilityResponse.status).toBe(200)
            expect(eligibilityData.success).toBe(true)
            expect(eligibilityData.data.eligible).toBe(true) // 60 days > 56 day minimum

            // Check donation history
            const donationHistoryRequest = createMockRequest('GET', '/api/donations', undefined, headers)
            const donationHistoryResponse = await donationsGet(donationHistoryRequest)
            const donationHistoryData = await donationHistoryResponse.json()

            expect(donationHistoryResponse.status).toBe(200)
            expect(donationHistoryData.success).toBe(true)
            expect(donationHistoryData.data).toHaveLength(1)
            expect(donationHistoryData.data[0].bloodType).toBe('O+')
            expect(donationHistoryData.data[0].status).toBe('completed')

            // Book new appointment
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 5)
            appointmentDate.setHours(14, 0, 0, 0) // 2 PM

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
                notes: 'Regular donation - 4th time!'
            }

            const appointmentRequest = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const appointmentResponse = await appointmentsPost(appointmentRequest)
            const appointmentResult = await appointmentResponse.json()

            expect(appointmentResponse.status).toBe(200)
            expect(appointmentResult.success).toBe(true)
            expect(appointmentResult.data.status).toBe('scheduled')
        })

        it('should prevent appointment booking for ineligible donor', async () => {
            // Create donor with recent donation (within 56 days)
            const { user } = await testManager.createTestUser({
                email: 'recent@donor.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const recentDonationDate = new Date()
            recentDonationDate.setDate(recentDonationDate.getDate() - 30) // 30 days ago

            await testManager.createTestDonor(user.id, {
                firstName: 'Recent',
                lastName: 'Donor',
                bloodType: 'A+',
                lastDonationDate: recentDonationDate.toISOString().split('T')[0]
            })

            const headers = await getAuthHeaders('recent@donor.com', 'SecurePass123!')

            // Check eligibility - should be false
            const eligibilityRequest = createMockRequest('GET', '/api/donors/eligibility', undefined, headers)
            const eligibilityResponse = await eligibilityGet(eligibilityRequest)
            const eligibilityData = await eligibilityResponse.json()

            expect(eligibilityResponse.status).toBe(200)
            expect(eligibilityData.success).toBe(true)
            expect(eligibilityData.data.eligible).toBe(false)
            expect(eligibilityData.data.nextEligibleDate).toBeDefined()

            // Try to book appointment - should fail
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString()
            }

            const appointmentRequest = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const appointmentResponse = await appointmentsPost(appointmentRequest)
            const appointmentResult = await appointmentResponse.json()

            expect(appointmentResponse.status).toBe(400)
            expect(appointmentResult.success).toBe(false)
            expect(appointmentResult.error.message).toContain('Next donation available')
        })

        it('should handle deferred donor attempting to book appointment', async () => {
            // Create temporarily deferred donor
            const { user } = await testManager.createTestUser({
                email: 'deferred@donor.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const deferralEndDate = new Date()
            deferralEndDate.setDate(deferralEndDate.getDate() + 30) // Deferred for 30 more days

            await testManager.createTestDonor(user.id, {
                firstName: 'Deferred',
                lastName: 'Donor',
                bloodType: 'B+',
                isDeferredTemporary: true
            })

            // Update deferral end date in database
            await testManager.testSupabase
                .from('donor_profiles')
                .update({
                    deferral_end_date: deferralEndDate.toISOString().split('T')[0],
                    deferral_reason: 'Low hemoglobin levels'
                })
                .eq('user_id', user.id)

            const headers = await getAuthHeaders('deferred@donor.com', 'SecurePass123!')

            // Check eligibility - should be false due to deferral
            const eligibilityRequest = createMockRequest('GET', '/api/donors/eligibility', undefined, headers)
            const eligibilityResponse = await eligibilityGet(eligibilityRequest)
            const eligibilityData = await eligibilityResponse.json()

            expect(eligibilityResponse.status).toBe(200)
            expect(eligibilityData.success).toBe(true)
            expect(eligibilityData.data.eligible).toBe(false)
            expect(eligibilityData.data.deferralReason).toBe('Low hemoglobin levels')
            expect(eligibilityData.data.deferralEndDate).toBeDefined()

            // Try to book appointment - should fail
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString()
            }

            const appointmentRequest = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const appointmentResponse = await appointmentsPost(appointmentRequest)
            const appointmentResult = await appointmentResponse.json()

            expect(appointmentResponse.status).toBe(400)
            expect(appointmentResult.success).toBe(false)
            expect(appointmentResult.error.message).toContain('temporarily deferred')
        })
    })

    describe('Appointment Management Journey', () => {
        let donorUser: any
        let donorProfile: any
        let scheduledAppointment: any

        beforeEach(async () => {
            // Create eligible donor
            const { user } = await testManager.createTestUser({
                email: 'appointmentdonor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })
            donorUser = user

            donorProfile = await testManager.createTestDonor(user.id, {
                firstName: 'Appointment',
                lastName: 'Donor',
                bloodType: 'O+'
            })

            // Create scheduled appointment
            scheduledAppointment = await testManager.createTestAppointment(
                donorProfile.id,
                testBloodBank.id,
                {
                    appointmentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
                    status: 'scheduled',
                    notes: 'Regular donation'
                }
            )
        })

        it('should allow donor to reschedule appointment', async () => {
            const headers = await getAuthHeaders('appointmentdonor@test.com', 'SecurePass123!')

            // Get current appointments
            const currentAppointmentsRequest = createMockRequest('GET', '/api/appointments', undefined, headers)
            const currentAppointmentsResponse = await appointmentsGet(currentAppointmentsRequest)
            const currentAppointmentsData = await currentAppointmentsResponse.json()

            expect(currentAppointmentsResponse.status).toBe(200)
            expect(currentAppointmentsData.data).toHaveLength(1)

            // Reschedule to different date
            const newDate = new Date()
            newDate.setDate(newDate.getDate() + 15) // 15 days from now
            newDate.setHours(11, 0, 0, 0) // 11 AM

            const updateData = {
                appointmentDate: newDate.toISOString(),
                notes: 'Rescheduled appointment'
            }

            const { PUT: appointmentPut } = await import('@/app/api/appointments/[id]/route')
            const updateRequest = createMockRequest('PUT', `/api/appointments/${scheduledAppointment.id}`, updateData, headers)
            const updateResponse = await appointmentPut(updateRequest, { params: { id: scheduledAppointment.id } })
            const updateResult = await updateResponse.json()

            expect(updateResponse.status).toBe(200)
            expect(updateResult.success).toBe(true)
            expect(updateResult.data.notes).toBe('Rescheduled appointment')
            expect(new Date(updateResult.data.appointmentDate).getTime()).toBe(newDate.getTime())
        })

        it('should allow donor to cancel appointment (more than 24 hours ahead)', async () => {
            const headers = await getAuthHeaders('appointmentdonor@test.com', 'SecurePass123!')

            const { DELETE: appointmentDelete } = await import('@/app/api/appointments/[id]/route')
            const cancelRequest = createMockRequest('DELETE', `/api/appointments/${scheduledAppointment.id}`, undefined, headers)
            const cancelResponse = await appointmentDelete(cancelRequest, { params: { id: scheduledAppointment.id } })
            const cancelResult = await cancelResponse.json()

            expect(cancelResponse.status).toBe(200)
            expect(cancelResult.success).toBe(true)
            expect(cancelResult.data.status).toBe('cancelled')

            // Verify appointment is cancelled in list
            const appointmentsRequest = createMockRequest('GET', '/api/appointments', undefined, headers)
            const appointmentsResponse = await appointmentsGet(appointmentsRequest)
            const appointmentsData = await appointmentsResponse.json()

            expect(appointmentsResponse.status).toBe(200)
            const cancelledAppointment = appointmentsData.data.find((apt: any) => apt.id === scheduledAppointment.id)
            expect(cancelledAppointment.status).toBe('cancelled')
        })

        it('should prevent cancellation within 24 hours', async () => {
            // Create appointment for tomorrow (within 24 hours)
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(10, 0, 0, 0)

            const nearAppointment = await testManager.createTestAppointment(
                donorProfile.id,
                testBloodBank.id,
                {
                    appointmentDate: tomorrow,
                    status: 'scheduled'
                }
            )

            const headers = await getAuthHeaders('appointmentdonor@test.com', 'SecurePass123!')

            const { DELETE: appointmentDelete } = await import('@/app/api/appointments/[id]/route')
            const cancelRequest = createMockRequest('DELETE', `/api/appointments/${nearAppointment.id}`, undefined, headers)
            const cancelResponse = await appointmentDelete(cancelRequest, { params: { id: nearAppointment.id } })
            const cancelResult = await cancelResponse.json()

            expect(cancelResponse.status).toBe(400)
            expect(cancelResult.success).toBe(false)
            expect(cancelResult.error.message).toContain('24 hours')
        })
    })
})