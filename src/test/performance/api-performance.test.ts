import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'

/**
 * API Performance Testing Suite
 * 
 * Tests API endpoints for performance characteristics including:
 * - Response times under normal load
 * - Response times with large datasets
 * - Memory usage patterns
 * - Database query efficiency
 */
describe('API Performance Tests', () => {
    let testManager: TestDataManager

    beforeEach(() => {
        testManager = new TestDataManager()
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('Authentication Performance', () => {
        it('should handle login requests within acceptable time limits', async () => {
            const { POST: loginPost } = await import('@/app/api/auth/login/route')

            // Create test user
            await testManager.createTestUser({
                email: 'perf@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const loginData = {
                email: 'perf@test.com',
                password: 'SecurePass123!'
            }

            // Measure login performance
            const startTime = performance.now()
            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(responseTime).toBeLessThan(1000) // Should complete within 1 second
        })

        it('should handle multiple concurrent login requests efficiently', async () => {
            const { POST: loginPost } = await import('@/app/api/auth/login/route')

            // Create multiple test users
            const users = []
            for (let i = 0; i < 10; i++) {
                await testManager.createTestUser({
                    email: `user${i}@test.com`,
                    password: 'SecurePass123!',
                    role: 'donor'
                })
                users.push({ email: `user${i}@test.com`, password: 'SecurePass123!' })
            }

            // Execute concurrent login requests
            const startTime = performance.now()
            const loginPromises = users.map(user => {
                const request = createMockRequest('POST', '/api/auth/login', user)
                return loginPost(request)
            })

            const responses = await Promise.all(loginPromises)
            const endTime = performance.now()

            const totalTime = endTime - startTime
            const averageTime = totalTime / users.length

            // All requests should succeed
            for (const response of responses) {
                expect(response.status).toBe(200)
            }

            // Average response time should be reasonable
            expect(averageTime).toBeLessThan(500) // Average under 500ms
            expect(totalTime).toBeLessThan(3000) // Total under 3 seconds
        })
    })

    describe('Appointment Listing Performance', () => {
        let testUser: any
        let testDonor: any
        let testBloodBank: any

        beforeEach(async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@perf.com',
                password: 'SecurePass123!',
                role: 'donor'
            })
            testUser = user
            testDonor = await testManager.createTestDonor(user.id)
            testBloodBank = await testManager.createTestBloodBank()
        })

        it('should handle appointment listing with small dataset efficiently', async () => {
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            // Create 10 appointments
            for (let i = 0; i < 10; i++) {
                await testManager.createTestAppointment(testDonor.id, testBloodBank.id, {
                    appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
                })
            }

            const headers = await getAuthHeaders('donor@perf.com', 'SecurePass123!')

            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=10', undefined, headers)
            const response = await appointmentsGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(10)
            expect(responseTime).toBeLessThan(500) // Should complete within 500ms
        })

        it('should handle appointment listing with large dataset efficiently', async () => {
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            // Create 100 appointments
            const appointmentPromises = []
            for (let i = 0; i < 100; i++) {
                appointmentPromises.push(
                    testManager.createTestAppointment(testDonor.id, testBloodBank.id, {
                        appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
                    })
                )
            }
            await Promise.all(appointmentPromises)

            const headers = await getAuthHeaders('donor@perf.com', 'SecurePass123!')

            // Test pagination performance
            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=20', undefined, headers)
            const response = await appointmentsGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(20)
            expect(responseTime).toBeLessThan(1000) // Should complete within 1 second even with large dataset
        })

        it('should handle filtered appointment queries efficiently', async () => {
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            // Create appointments with different statuses
            for (let i = 0; i < 50; i++) {
                const status = i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'scheduled' : 'cancelled'
                await testManager.createTestAppointment(testDonor.id, testBloodBank.id, {
                    status,
                    appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
                })
            }

            const headers = await getAuthHeaders('donor@perf.com', 'SecurePass123!')

            // Test filtered query performance
            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/appointments?status=scheduled&page=1&limit=20', undefined, headers)
            const response = await appointmentsGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(responseTime).toBeLessThan(800) // Filtered queries should still be fast

            // Verify all returned appointments have the correct status
            data.data.forEach((appointment: any) => {
                expect(appointment.status).toBe('scheduled')
            })
        })
    })

    describe('Blood Request Performance', () => {
        let facilityUser: any
        let testFacility: any

        beforeEach(async () => {
            const { user } = await testManager.createTestUser({
                email: 'facility@perf.com',
                password: 'SecurePass123!',
                role: 'facility'
            })
            facilityUser = user
            testFacility = await testManager.createTestFacility({
                email: 'facility@perf.com'
            })
        })

        it('should handle blood request creation efficiently', async () => {
            const { POST: requestsPost } = await import('@/app/api/requests/route')

            const requestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                patientInfo: {
                    age: 45,
                    gender: 'M',
                    procedure: 'Surgery'
                }
            }

            const headers = await getAuthHeaders('facility@perf.com', 'SecurePass123!')

            const startTime = performance.now()
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(responseTime).toBeLessThan(1000) // Should complete within 1 second
        })

        it('should handle multiple concurrent blood request creations', async () => {
            const { POST: requestsPost } = await import('@/app/api/requests/route')

            const headers = await getAuthHeaders('facility@perf.com', 'SecurePass123!')

            // Create multiple concurrent requests
            const requestPromises = []
            for (let i = 0; i < 10; i++) {
                const requestData = {
                    bloodType: i % 2 === 0 ? 'O+' : 'A+',
                    unitsRequested: i + 1,
                    urgencyLevel: 'routine',
                    requiredBy: new Date(Date.now() + (48 + i) * 60 * 60 * 1000).toISOString(),
                    patientInfo: {
                        age: 30 + i,
                        gender: i % 2 === 0 ? 'M' : 'F',
                        procedure: `Surgery ${i}`
                    }
                }

                const request = createMockRequest('POST', '/api/requests', requestData, headers)
                requestPromises.push(requestsPost(request))
            }

            const startTime = performance.now()
            const responses = await Promise.all(requestPromises)
            const endTime = performance.now()

            const totalTime = endTime - startTime
            const averageTime = totalTime / requestPromises.length

            // All requests should succeed
            for (const response of responses) {
                expect(response.status).toBe(200)
            }

            expect(averageTime).toBeLessThan(600) // Average under 600ms
            expect(totalTime).toBeLessThan(4000) // Total under 4 seconds
        })

        it('should handle blood request listing with large dataset', async () => {
            const { GET: requestsGet } = await import('@/app/api/requests/route')

            // Create 100 blood requests
            const requestPromises = []
            for (let i = 0; i < 100; i++) {
                requestPromises.push(
                    testManager.createTestBloodRequest(testFacility.id, {
                        bloodType: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'][i % 8],
                        unitsRequested: (i % 10) + 1,
                        urgencyLevel: ['routine', 'urgent', 'emergency'][i % 3] as any
                    })
                )
            }
            await Promise.all(requestPromises)

            const headers = await getAuthHeaders('facility@perf.com', 'SecurePass123!')

            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/requests?page=1&limit=25', undefined, headers)
            const response = await requestsGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(25)
            expect(responseTime).toBeLessThan(1200) // Should handle large dataset within 1.2 seconds
        })
    })

    describe('Database Query Performance', () => {
        it('should handle complex joins efficiently', async () => {
            // Create comprehensive test data
            const { user } = await testManager.createTestUser({
                email: 'complex@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create multiple appointments and donations
            for (let i = 0; i < 20; i++) {
                const appointment = await testManager.createTestAppointment(donor.id, bloodBank.id, {
                    status: 'completed',
                    appointmentDate: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
                })

                // Create donation record for completed appointment
                await testManager.testSupabase
                    .from('donation_history')
                    .insert({
                        donor_id: donor.id,
                        blood_bank_id: bloodBank.id,
                        appointment_id: appointment.id,
                        donation_date: appointment.appointmentDate,
                        blood_type: 'O+',
                        units_donated: 1,
                        hemoglobin_level: 14.0 + (i * 0.1),
                        blood_pressure_systolic: 120,
                        blood_pressure_diastolic: 80,
                        status: 'completed'
                    })
            }

            const { GET: donationsGet } = await import('@/app/api/donations/route')
            const headers = await getAuthHeaders('complex@test.com', 'SecurePass123!')

            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/donations?page=1&limit=10', undefined, headers)
            const response = await donationsGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(responseTime).toBeLessThan(1000) // Complex joins should complete within 1 second
        })

        it('should handle inventory queries efficiently', async () => {
            const bloodBank = await testManager.createTestBloodBank()

            // Create inventory for all blood types
            const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
            for (const bloodType of bloodTypes) {
                await testManager.createTestInventory(bloodBank.id, {
                    bloodType,
                    unitsAvailable: Math.floor(Math.random() * 100) + 10
                })
            }

            const { GET: bloodbanksGet } = await import('@/app/api/bloodbanks/route')
            const { user } = await testManager.createTestUser({
                email: 'admin@test.com',
                password: 'SecurePass123!',
                role: 'admin'
            })

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')

            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/bloodbanks', undefined, headers)
            const response = await bloodbanksGet(request)
            const endTime = performance.now()

            const responseTime = endTime - startTime
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(responseTime).toBeLessThan(800) // Inventory queries should be fast
        })
    })

    describe('Memory Usage Performance', () => {
        it('should handle large response payloads efficiently', async () => {
            const { user } = await testManager.createTestUser({
                email: 'memory@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create a large number of appointments
            const appointmentPromises = []
            for (let i = 0; i < 200; i++) {
                appointmentPromises.push(
                    testManager.createTestAppointment(donor.id, bloodBank.id, {
                        appointmentDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
                        notes: `Appointment ${i} with detailed notes that make the payload larger`
                    })
                )
            }
            await Promise.all(appointmentPromises)

            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')
            const headers = await getAuthHeaders('memory@test.com', 'SecurePass123!')

            // Measure memory usage before request
            const memBefore = process.memoryUsage()

            const startTime = performance.now()
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=50', undefined, headers)
            const response = await appointmentsGet(request)
            const endTime = performance.now()

            // Measure memory usage after request
            const memAfter = process.memoryUsage()

            const responseTime = endTime - startTime
            const data = await response.json()
            const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(50)
            expect(responseTime).toBeLessThan(1500) // Should handle large payload within 1.5 seconds
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Memory increase should be reasonable (< 50MB)
        })
    })

    describe('Concurrent Request Performance', () => {
        it('should handle mixed concurrent requests efficiently', async () => {
            // Create test users for different roles
            const { user: donorUser } = await testManager.createTestUser({
                email: 'donor@concurrent.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const { user: facilityUser } = await testManager.createTestUser({
                email: 'facility@concurrent.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const donor = await testManager.createTestDonor(donorUser.id)
            const facility = await testManager.createTestFacility({
                email: 'facility@concurrent.com'
            })
            const bloodBank = await testManager.createTestBloodBank()

            // Create some initial data
            await testManager.createTestAppointment(donor.id, bloodBank.id)
            await testManager.createTestBloodRequest(facility.id)

            const donorHeaders = await getAuthHeaders('donor@concurrent.com', 'SecurePass123!')
            const facilityHeaders = await getAuthHeaders('facility@concurrent.com', 'SecurePass123!')

            // Import API handlers
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')
            const { GET: requestsGet } = await import('@/app/api/requests/route')
            const { GET: profileGet } = await import('@/app/api/auth/profile/route')

            // Create mixed concurrent requests
            const concurrentRequests = [
                appointmentsGet(createMockRequest('GET', '/api/appointments', undefined, donorHeaders)),
                requestsGet(createMockRequest('GET', '/api/requests', undefined, facilityHeaders)),
                profileGet(createMockRequest('GET', '/api/auth/profile', undefined, donorHeaders)),
                profileGet(createMockRequest('GET', '/api/auth/profile', undefined, facilityHeaders)),
                appointmentsGet(createMockRequest('GET', '/api/appointments?status=scheduled', undefined, donorHeaders))
            ]

            const startTime = performance.now()
            const responses = await Promise.all(concurrentRequests)
            const endTime = performance.now()

            const totalTime = endTime - startTime
            const averageTime = totalTime / concurrentRequests.length

            // All requests should succeed
            for (const response of responses) {
                expect(response.status).toBe(200)
            }

            expect(averageTime).toBeLessThan(800) // Average response time should be reasonable
            expect(totalTime).toBeLessThan(3000) // Total time should be reasonable for concurrent execution
        })
    })
})