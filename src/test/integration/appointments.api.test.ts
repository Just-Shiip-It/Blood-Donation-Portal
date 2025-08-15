import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST as appointmentsPost, GET as appointmentsGet } from '@/app/api/appointments/route'
import { PUT as appointmentPut, DELETE as appointmentDelete } from '@/app/api/appointments/[id]/route'
import { GET as availabilityGet } from '@/app/api/appointments/availability/route'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'

describe('Appointments API Integration Tests', () => {
    let testManager: TestDataManager
    let testUser: any
    let testDonor: any
    let testBloodBank: any

    beforeEach(async () => {
        testManager = new TestDataManager()

        // Create test user and donor
        const { user } = await testManager.createTestUser({
            email: 'donor@test.com',
            password: 'SecurePass123!',
            role: 'donor'
        })
        testUser = user

        testDonor = await testManager.createTestDonor(user.id, {
            firstName: 'Test',
            lastName: 'Donor',
            bloodType: 'O+'
        })

        // Create test blood bank
        testBloodBank = await testManager.createTestBloodBank({
            name: 'Test Blood Bank',
            capacity: 20
        })

        // Create inventory for the blood bank
        await testManager.createTestInventory(testBloodBank.id, {
            bloodType: 'O+',
            unitsAvailable: 50
        })
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('POST /api/appointments', () => {
        it('should create appointment successfully', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7) // Next week
            appointmentDate.setHours(10, 0, 0, 0) // 10 AM

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString(),
                notes: 'Test appointment'
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const response = await appointmentsPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.donorId).toBe(testDonor.id)
            expect(data.data.bloodBankId).toBe(testBloodBank.id)
            expect(data.data.status).toBe('scheduled')
            expect(data.data.notes).toBe('Test appointment')
        })

        it('should reject appointment for deferred donor', async () => {
            // Mark donor as temporarily deferred
            await testManager.testSupabase
                .from('donor_profiles')
                .update({
                    is_deferred_temporary: true,
                    deferral_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                })
                .eq('id', testDonor.id)

            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString()
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const response = await appointmentsPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.message).toContain('temporarily deferred')
        })

        it('should reject appointment too soon after last donation', async () => {
            // Set last donation date to 30 days ago (less than 56 day minimum)
            const lastDonationDate = new Date()
            lastDonationDate.setDate(lastDonationDate.getDate() - 30)

            await testManager.testSupabase
                .from('donor_profiles')
                .update({
                    last_donation_date: lastDonationDate.toISOString().split('T')[0]
                })
                .eq('id', testDonor.id)

            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(10, 0, 0, 0)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString()
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const response = await appointmentsPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.message).toContain('Next donation available')
        })

        it('should reject appointment outside operating hours', async () => {
            const appointmentDate = new Date()
            appointmentDate.setDate(appointmentDate.getDate() + 7)
            appointmentDate.setHours(20, 0, 0, 0) // 8 PM (outside operating hours)

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: appointmentDate.toISOString()
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const response = await appointmentsPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.message).toContain('outside operating hours')
        })

        it('should reject unauthenticated request', async () => {
            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: new Date().toISOString()
            }

            const request = createMockRequest('POST', '/api/appointments', appointmentData)
            const response = await appointmentsPost(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('UNAUTHORIZED')
        })
    })

    describe('GET /api/appointments', () => {
        let testAppointment: any

        beforeEach(async () => {
            testAppointment = await testManager.createTestAppointment(
                testDonor.id,
                testBloodBank.id,
                {
                    appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'scheduled',
                    notes: 'Test appointment'
                }
            )
        })

        it('should get donor appointments successfully', async () => {
            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=10', undefined, headers)
            const response = await appointmentsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].id).toBe(testAppointment.id)
            expect(data.data[0].bloodBank.name).toBe(testBloodBank.name)
        })

        it('should filter appointments by status', async () => {
            // Create cancelled appointment
            await testManager.createTestAppointment(
                testDonor.id,
                testBloodBank.id,
                {
                    status: 'cancelled'
                }
            )

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments?status=scheduled', undefined, headers)
            const response = await appointmentsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].status).toBe('scheduled')
        })

        it('should filter appointments by date range', async () => {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 5)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 10)

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest(
                'GET',
                `/api/appointments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                undefined,
                headers
            )
            const response = await appointmentsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
        })

        it('should handle pagination', async () => {
            // Create multiple appointments
            for (let i = 0; i < 5; i++) {
                await testManager.createTestAppointment(
                    testDonor.id,
                    testBloodBank.id,
                    {
                        appointmentDate: new Date(Date.now() + (i + 8) * 24 * 60 * 60 * 1000)
                    }
                )
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=3', undefined, headers)
            const response = await appointmentsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(3)
        })
    })

    describe('PUT /api/appointments/[id]', () => {
        let testAppointment: any

        beforeEach(async () => {
            testAppointment = await testManager.createTestAppointment(
                testDonor.id,
                testBloodBank.id,
                {
                    appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'scheduled'
                }
            )
        })

        it('should update appointment successfully', async () => {
            const newDate = new Date()
            newDate.setDate(newDate.getDate() + 14)
            newDate.setHours(14, 0, 0, 0) // 2 PM

            const updateData = {
                appointmentDate: newDate.toISOString(),
                notes: 'Updated appointment'
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/appointments/${testAppointment.id}`, updateData, headers)
            const response = await appointmentPut(request, { params: { id: testAppointment.id } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.notes).toBe('Updated appointment')
            expect(new Date(data.data.appointmentDate).getTime()).toBe(newDate.getTime())
        })

        it('should reject update for non-owner', async () => {
            // Create another user
            const { user: otherUser } = await testManager.createTestUser({
                email: 'other@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            await testManager.createTestDonor(otherUser.id)

            const updateData = {
                notes: 'Unauthorized update'
            }

            const headers = await getAuthHeaders('other@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/appointments/${testAppointment.id}`, updateData, headers)
            const response = await appointmentPut(request, { params: { id: testAppointment.id } })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('FORBIDDEN')
        })
    })

    describe('DELETE /api/appointments/[id]', () => {
        let testAppointment: any

        beforeEach(async () => {
            testAppointment = await testManager.createTestAppointment(
                testDonor.id,
                testBloodBank.id,
                {
                    appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'scheduled'
                }
            )
        })

        it('should cancel appointment successfully', async () => {
            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('DELETE', `/api/appointments/${testAppointment.id}`, undefined, headers)
            const response = await appointmentDelete(request, { params: { id: testAppointment.id } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.status).toBe('cancelled')
        })

        it('should reject cancellation within 24 hours', async () => {
            // Create appointment for tomorrow (within 24 hours)
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            tomorrow.setHours(10, 0, 0, 0)

            const nearAppointment = await testManager.createTestAppointment(
                testDonor.id,
                testBloodBank.id,
                {
                    appointmentDate: tomorrow,
                    status: 'scheduled'
                }
            )

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('DELETE', `/api/appointments/${nearAppointment.id}`, undefined, headers)
            const response = await appointmentDelete(request, { params: { id: nearAppointment.id } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.message).toContain('24 hours')
        })
    })

    describe('GET /api/appointments/availability', () => {
        it('should get available slots successfully', async () => {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 7)

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest(
                'GET',
                `/api/appointments/availability?bloodBankId=${testBloodBank.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
                undefined,
                headers
            )
            const response = await availabilityGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeGreaterThan(0)
            expect(data.data[0]).toHaveProperty('bloodBankId')
            expect(data.data[0]).toHaveProperty('date')
            expect(data.data[0]).toHaveProperty('available')
        })

        it('should filter by location', async () => {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() + 1)
            const endDate = new Date()
            endDate.setDate(endDate.getDate() + 7)

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest(
                'GET',
                `/api/appointments/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&latitude=40.7128&longitude=-74.0060&radius=10`,
                undefined,
                headers
            )
            const response = await availabilityGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeGreaterThan(0)
        })
    })
})