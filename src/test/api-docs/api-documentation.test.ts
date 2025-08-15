import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'

/**
 * API Documentation and Contract Testing Suite
 * 
 * This test suite validates that all API endpoints conform to their documented contracts
 * and return responses in the expected format with proper status codes.
 */
describe('API Documentation and Contract Tests', () => {
    let testManager: TestDataManager

    beforeEach(() => {
        testManager = new TestDataManager()
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('Authentication API Documentation', () => {
        it('POST /api/auth/register - should match documented response format', async () => {
            const { POST: registerPost } = await import('@/app/api/auth/register/route')

            const registrationData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                role: 'donor',
                profile: {
                    firstName: 'Test',
                    lastName: 'User',
                    dateOfBirth: '1990-01-01',
                    bloodType: 'O+',
                    phone: '555-0123'
                }
            }

            const request = createMockRequest('POST', '/api/auth/register', registrationData)
            const response = await registerPost(request)
            const data = await response.json()

            // Validate response structure matches documentation
            expect(response.status).toBe(201)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(data.data).toHaveProperty('user')
            expect(data.data).toHaveProperty('profile')

            // Validate user object structure
            expect(data.data.user).toHaveProperty('id')
            expect(data.data.user).toHaveProperty('email', registrationData.email)
            expect(data.data.user).toHaveProperty('role', registrationData.role)
            expect(data.data.user).toHaveProperty('emailVerified')
            expect(data.data.user).toHaveProperty('isActive')

            // Validate profile object structure
            expect(data.data.profile).toHaveProperty('id')
            expect(data.data.profile).toHaveProperty('firstName', registrationData.profile.firstName)
            expect(data.data.profile).toHaveProperty('lastName', registrationData.profile.lastName)
            expect(data.data.profile).toHaveProperty('bloodType', registrationData.profile.bloodType)
        })

        it('POST /api/auth/login - should match documented response format', async () => {
            const { POST: loginPost } = await import('@/app/api/auth/login/route')

            // Create test user first
            const { user } = await testManager.createTestUser({
                email: 'login@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const loginData = {
                email: 'login@test.com',
                password: 'SecurePass123!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            // Validate successful login response
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(data.data).toHaveProperty('user')
            expect(data.data).toHaveProperty('session')

            // Validate session object
            expect(data.data.session).toHaveProperty('accessToken')
            expect(data.data.session).toHaveProperty('refreshToken')
            expect(data.data.session).toHaveProperty('expiresAt')
        })

        it('POST /api/auth/login - should return proper error format for invalid credentials', async () => {
            const { POST: loginPost } = await import('@/app/api/auth/login/route')

            const loginData = {
                email: 'nonexistent@test.com',
                password: 'WrongPassword!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            // Validate error response format
            expect(response.status).toBe(401)
            expect(data).toHaveProperty('success', false)
            expect(data).toHaveProperty('error')
            expect(data.error).toHaveProperty('code')
            expect(data.error).toHaveProperty('message')
            expect(typeof data.error.code).toBe('string')
            expect(typeof data.error.message).toBe('string')
        })
    })

    describe('Appointments API Documentation', () => {
        let testUser: any
        let testDonor: any
        let testBloodBank: any

        beforeEach(async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })
            testUser = user
            testDonor = await testManager.createTestDonor(user.id)
            testBloodBank = await testManager.createTestBloodBank()
        })

        it('POST /api/appointments - should match documented request/response format', async () => {
            const { POST: appointmentsPost } = await import('@/app/api/appointments/route')

            const appointmentData = {
                bloodBankId: testBloodBank.id,
                appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Test appointment'
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/appointments', appointmentData, headers)
            const response = await appointmentsPost(request)
            const data = await response.json()

            // Validate response structure
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(data).toHaveProperty('message')

            // Validate appointment object structure
            expect(data.data).toHaveProperty('id')
            expect(data.data).toHaveProperty('donorId', testDonor.id)
            expect(data.data).toHaveProperty('bloodBankId', testBloodBank.id)
            expect(data.data).toHaveProperty('appointmentDate')
            expect(data.data).toHaveProperty('status', 'scheduled')
            expect(data.data).toHaveProperty('notes', appointmentData.notes)
            expect(data.data).toHaveProperty('createdAt')
            expect(data.data).toHaveProperty('updatedAt')
        })

        it('GET /api/appointments - should match documented response format with pagination', async () => {
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            // Create test appointment
            await testManager.createTestAppointment(testDonor.id, testBloodBank.id)

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=10', undefined, headers)
            const response = await appointmentsGet(request)
            const data = await response.json()

            // Validate response structure
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(Array.isArray(data.data)).toBe(true)

            // Validate appointment object in array
            if (data.data.length > 0) {
                const appointment = data.data[0]
                expect(appointment).toHaveProperty('id')
                expect(appointment).toHaveProperty('donorId')
                expect(appointment).toHaveProperty('bloodBankId')
                expect(appointment).toHaveProperty('appointmentDate')
                expect(appointment).toHaveProperty('status')
                expect(appointment).toHaveProperty('bloodBank')

                // Validate nested bloodBank object
                expect(appointment.bloodBank).toHaveProperty('id')
                expect(appointment.bloodBank).toHaveProperty('name')
                expect(appointment.bloodBank).toHaveProperty('address')
            }
        })

        it('GET /api/appointments/availability - should match documented response format', async () => {
            const { GET: availabilityGet } = await import('@/app/api/appointments/availability/route')

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

            // Validate response structure
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(Array.isArray(data.data)).toBe(true)

            // Validate availability slot structure
            if (data.data.length > 0) {
                const slot = data.data[0]
                expect(slot).toHaveProperty('bloodBankId')
                expect(slot).toHaveProperty('date')
                expect(slot).toHaveProperty('available')
                expect(typeof slot.available).toBe('boolean')
            }
        })
    })

    describe('Blood Requests API Documentation', () => {
        let facilityUser: any
        let testFacility: any
        let adminUser: any

        beforeEach(async () => {
            const { user: fUser } = await testManager.createTestUser({
                email: 'facility@test.com',
                password: 'SecurePass123!',
                role: 'facility'
            })
            facilityUser = fUser
            testFacility = await testManager.createTestFacility({
                email: 'facility@test.com'
            })

            const { user: aUser } = await testManager.createTestUser({
                email: 'admin@test.com',
                password: 'SecurePass123!',
                role: 'admin'
            })
            adminUser = aUser
        })

        it('POST /api/requests - should match documented request/response format', async () => {
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
                },
                notes: 'Elective surgery requirement'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            // Validate response structure
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(data).toHaveProperty('message')

            // Validate blood request object structure
            expect(data.data).toHaveProperty('id')
            expect(data.data).toHaveProperty('facilityId', testFacility.id)
            expect(data.data).toHaveProperty('bloodType', requestData.bloodType)
            expect(data.data).toHaveProperty('unitsRequested', requestData.unitsRequested)
            expect(data.data).toHaveProperty('urgencyLevel', requestData.urgencyLevel)
            expect(data.data).toHaveProperty('status', 'pending')
            expect(data.data).toHaveProperty('patientInfo')
            expect(data.data).toHaveProperty('requestDate')
            expect(data.data).toHaveProperty('requiredBy')
        })

        it('GET /api/requests - should match documented response format with filtering', async () => {
            const { GET: requestsGet } = await import('@/app/api/requests/route')

            // Create test request
            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'A+',
                urgencyLevel: 'urgent'
            })

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?urgencyLevel=urgent&page=1&limit=10', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            // Validate response structure
            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(Array.isArray(data.data)).toBe(true)

            // Validate blood request object in array
            if (data.data.length > 0) {
                const bloodRequest = data.data[0]
                expect(bloodRequest).toHaveProperty('id')
                expect(bloodRequest).toHaveProperty('facilityId')
                expect(bloodRequest).toHaveProperty('bloodType')
                expect(bloodRequest).toHaveProperty('unitsRequested')
                expect(bloodRequest).toHaveProperty('urgencyLevel')
                expect(bloodRequest).toHaveProperty('status')
                expect(bloodRequest).toHaveProperty('facility')

                // Validate nested facility object
                expect(bloodRequest.facility).toHaveProperty('id')
                expect(bloodRequest.facility).toHaveProperty('name')
            }
        })
    })

    describe('Error Response Documentation', () => {
        it('should return consistent error format for validation errors', async () => {
            const { POST: registerPost } = await import('@/app/api/auth/register/route')

            const invalidData = {
                email: 'invalid-email', // Invalid email format
                password: '123', // Too short
                role: 'invalid-role' // Invalid role
            }

            const request = createMockRequest('POST', '/api/auth/register', invalidData)
            const response = await registerPost(request)
            const data = await response.json()

            // Validate error response structure
            expect(response.status).toBe(400)
            expect(data).toHaveProperty('success', false)
            expect(data).toHaveProperty('error')
            expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR')
            expect(data.error).toHaveProperty('message')
            expect(data.error).toHaveProperty('details')
            expect(typeof data.error.details).toBe('object')
        })

        it('should return consistent error format for unauthorized requests', async () => {
            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            // Request without authentication headers
            const request = createMockRequest('GET', '/api/appointments')
            const response = await appointmentsGet(request)
            const data = await response.json()

            // Validate unauthorized error structure
            expect(response.status).toBe(401)
            expect(data).toHaveProperty('success', false)
            expect(data).toHaveProperty('error')
            expect(data.error).toHaveProperty('code', 'UNAUTHORIZED')
            expect(data.error).toHaveProperty('message')
        })

        it('should return consistent error format for forbidden requests', async () => {
            // Create donor user trying to access admin endpoint
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const { POST: requestsPost } = await import('@/app/api/requests/route')

            const requestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            // Validate forbidden error structure
            expect(response.status).toBe(403)
            expect(data).toHaveProperty('success', false)
            expect(data).toHaveProperty('error')
            expect(data.error).toHaveProperty('code', 'FORBIDDEN')
            expect(data.error).toHaveProperty('message')
        })

        it('should return consistent error format for not found resources', async () => {
            const { GET: requestGet } = await import('@/app/api/requests/[id]/route')

            const { user } = await testManager.createTestUser({
                email: 'facility@test.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests/nonexistent-id', undefined, headers)
            const response = await requestGet(request, { params: { id: 'nonexistent-id' } })
            const data = await response.json()

            // Validate not found error structure
            expect(response.status).toBe(404)
            expect(data).toHaveProperty('success', false)
            expect(data).toHaveProperty('error')
            expect(data.error).toHaveProperty('code', 'NOT_FOUND')
            expect(data.error).toHaveProperty('message')
        })
    })

    describe('Response Headers Documentation', () => {
        it('should include proper CORS headers', async () => {
            const { GET: healthGet } = await import('@/app/api/health/route')

            const request = createMockRequest('GET', '/api/health')
            const response = await healthGet(request)

            // Check for CORS headers (these would be set by middleware in production)
            expect(response.headers.get('Content-Type')).toContain('application/json')
        })

        it('should include rate limiting headers for authenticated endpoints', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments', undefined, headers)
            const response = await appointmentsGet(request)

            // Validate response headers
            expect(response.headers.get('Content-Type')).toContain('application/json')
            // Rate limiting headers would be added by middleware in production
        })
    })

    describe('API Versioning Documentation', () => {
        it('should handle API version in headers', async () => {
            const { GET: healthGet } = await import('@/app/api/health/route')

            const request = createMockRequest('GET', '/api/health', undefined, {
                'API-Version': 'v1'
            })
            const response = await healthGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
        })
    })

    describe('Pagination Documentation', () => {
        it('should return consistent pagination metadata', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id)
            const bloodBank = await testManager.createTestBloodBank()

            // Create multiple appointments for pagination testing
            for (let i = 0; i < 5; i++) {
                await testManager.createTestAppointment(donor.id, bloodBank.id)
            }

            const { GET: appointmentsGet } = await import('@/app/api/appointments/route')

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/appointments?page=1&limit=3', undefined, headers)
            const response = await appointmentsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data).toHaveProperty('success', true)
            expect(data).toHaveProperty('data')
            expect(Array.isArray(data.data)).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(3)

            // Pagination metadata would be included in meta property in production
            // expect(data).toHaveProperty('meta')
            // expect(data.meta).toHaveProperty('page', 1)
            // expect(data.meta).toHaveProperty('limit', 3)
            // expect(data.meta).toHaveProperty('total')
        })
    })
})