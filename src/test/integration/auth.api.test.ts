import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as registerPost } from '@/app/api/auth/register/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { GET as profileGet, PUT as profilePut } from '@/app/api/auth/profile/route'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'

describe('Authentication API Integration Tests', () => {
    let testManager: TestDataManager

    beforeEach(() => {
        testManager = new TestDataManager()
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('POST /api/auth/register', () => {
        it('should register a new donor successfully', async () => {
            const registerData = {
                email: 'newdonor@test.com',
                password: 'SecurePass123!',
                role: 'donor',
                profile: {
                    firstName: 'New',
                    lastName: 'Donor',
                    dateOfBirth: '1990-05-15',
                    bloodType: 'A+',
                    phone: '555-0199'
                }
            }

            const request = createMockRequest('POST', '/api/auth/register', registerData)
            const response = await registerPost(request)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.success).toBe(true)
            expect(data.data.user.email).toBe(registerData.email)
            expect(data.data.user.role).toBe('donor')
            expect(data.data.profile.firstName).toBe(registerData.profile.firstName)
        })

        it('should register a new healthcare facility successfully', async () => {
            const registerData = {
                email: 'facility@test.com',
                password: 'SecurePass123!',
                role: 'facility',
                profile: {
                    name: 'Test Medical Center',
                    phone: '555-0200',
                    facilityType: 'hospital',
                    licenseNumber: 'LIC123456',
                    address: {
                        street: '123 Medical Ave',
                        city: 'Test City',
                        state: 'TS',
                        zipCode: '12345'
                    }
                }
            }

            const request = createMockRequest('POST', '/api/auth/register', registerData)
            const response = await registerPost(request)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.success).toBe(true)
            expect(data.data.user.email).toBe(registerData.email)
            expect(data.data.user.role).toBe('facility')
            expect(data.data.profile.name).toBe(registerData.profile.name)
        })

        it('should reject registration with invalid email', async () => {
            const registerData = {
                email: 'invalid-email',
                password: 'SecurePass123!',
                role: 'donor'
            }

            const request = createMockRequest('POST', '/api/auth/register', registerData)
            const response = await registerPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('VALIDATION_ERROR')
        })

        it('should reject registration with weak password', async () => {
            const registerData = {
                email: 'test@example.com',
                password: '123',
                role: 'donor'
            }

            const request = createMockRequest('POST', '/api/auth/register', registerData)
            const response = await registerPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('VALIDATION_ERROR')
        })

        it('should reject duplicate email registration', async () => {
            // Create first user
            await testManager.createTestUser({
                email: 'existing@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const registerData = {
                email: 'existing@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            }

            const request = createMockRequest('POST', '/api/auth/register', registerData)
            const response = await registerPost(request)
            const data = await response.json()

            expect(response.status).toBe(409)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('EMAIL_EXISTS')
        })
    })

    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const loginData = {
                email: 'donor@test.com',
                password: 'SecurePass123!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.user.email).toBe(user.email)
            expect(data.data.user.role).toBe(user.role)
            expect(data.data.session.accessToken).toBeDefined()
        })

        it('should reject login with invalid credentials', async () => {
            await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const loginData = {
                email: 'donor@test.com',
                password: 'WrongPassword!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('AUTH_ERROR')
        })

        it('should reject login for unconfirmed email', async () => {
            await testManager.createTestUser({
                email: 'unconfirmed@test.com',
                password: 'SecurePass123!',
                role: 'donor',
                emailConfirm: false
            })

            const loginData = {
                email: 'unconfirmed@test.com',
                password: 'SecurePass123!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('EMAIL_NOT_CONFIRMED')
        })

        it('should reject login for inactive user', async () => {
            const { user } = await testManager.createTestUser({
                email: 'inactive@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            // Deactivate user
            await testManager.testSupabase
                .from('users')
                .update({ is_active: false })
                .eq('id', user.id)

            const loginData = {
                email: 'inactive@test.com',
                password: 'SecurePass123!'
            }

            const request = createMockRequest('POST', '/api/auth/login', loginData)
            const response = await loginPost(request)
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('ACCOUNT_DISABLED')
        })
    })

    describe('GET /api/auth/profile', () => {
        it('should get donor profile successfully', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const donor = await testManager.createTestDonor(user.id, {
                firstName: 'Test',
                lastName: 'Donor',
                bloodType: 'O+'
            })

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/auth/profile', undefined, headers)
            const response = await profileGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.user.email).toBe(user.email)
            expect(data.data.profile.firstName).toBe(donor.firstName)
            expect(data.data.profile.bloodType).toBe(donor.bloodType)
        })

        it('should reject unauthenticated request', async () => {
            const request = createMockRequest('GET', '/api/auth/profile')
            const response = await profileGet(request)
            const data = await response.json()

            expect(response.status).toBe(401)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('UNAUTHORIZED')
        })
    })

    describe('PUT /api/auth/profile', () => {
        it('should update donor profile successfully', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            await testManager.createTestDonor(user.id)

            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                phone: '555-9999',
                preferences: {
                    emailNotifications: false,
                    smsNotifications: true
                }
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', '/api/auth/profile', updateData, headers)
            const response = await profilePut(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.firstName).toBe(updateData.firstName)
            expect(data.data.lastName).toBe(updateData.lastName)
            expect(data.data.phone).toBe(updateData.phone)
        })

        it('should reject invalid profile data', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            await testManager.createTestDonor(user.id)

            const updateData = {
                firstName: '', // Invalid empty name
                bloodType: 'INVALID' // Invalid blood type
            }

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', '/api/auth/profile', updateData, headers)
            const response = await profilePut(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('VALIDATION_ERROR')
        })
    })

    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const { user } = await testManager.createTestUser({
                email: 'donor@test.com',
                password: 'SecurePass123!',
                role: 'donor'
            })

            const headers = await getAuthHeaders('donor@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/auth/logout', undefined, headers)
            const response = await logoutPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.message).toBe('Logged out successfully')
        })
    })
})