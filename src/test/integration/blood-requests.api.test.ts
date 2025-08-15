import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST as requestsPost, GET as requestsGet } from '@/app/api/requests/route'
import { PUT as requestPut, GET as requestGet } from '@/app/api/requests/[id]/route'
import { POST as urgentPost } from '@/app/api/requests/urgent/route'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'

describe('Blood Requests API Integration Tests', () => {
    let testManager: TestDataManager
    let facilityUser: any
    let testFacility: any
    let adminUser: any
    let testBloodBank: any

    beforeEach(async () => {
        testManager = new TestDataManager()

        // Create facility user and profile
        const { user: fUser } = await testManager.createTestUser({
            email: 'facility@test.com',
            password: 'SecurePass123!',
            role: 'facility'
        })
        facilityUser = fUser

        testFacility = await testManager.createTestFacility({
            name: 'Test Hospital',
            email: 'facility@test.com'
        })

        // Create admin user
        const { user: aUser } = await testManager.createTestUser({
            email: 'admin@test.com',
            password: 'SecurePass123!',
            role: 'admin'
        })
        adminUser = aUser

        // Create blood bank with inventory
        testBloodBank = await testManager.createTestBloodBank()
        await testManager.createTestInventory(testBloodBank.id, {
            bloodType: 'O+',
            unitsAvailable: 50,
            minimumThreshold: 10
        })
        await testManager.createTestInventory(testBloodBank.id, {
            bloodType: 'A+',
            unitsAvailable: 30,
            minimumThreshold: 10
        })
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('POST /api/requests', () => {
        it('should create blood request successfully', async () => {
            const requestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
                patientInfo: {
                    age: 45,
                    gender: 'M',
                    procedure: 'Surgery'
                },
                notes: 'Routine surgery requirement'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.facilityId).toBe(testFacility.id)
            expect(data.data.bloodType).toBe(requestData.bloodType)
            expect(data.data.unitsRequested).toBe(requestData.unitsRequested)
            expect(data.data.urgencyLevel).toBe(requestData.urgencyLevel)
            expect(data.data.status).toBe('pending')
        })

        it('should create urgent blood request successfully', async () => {
            const requestData = {
                bloodType: 'A+',
                unitsRequested: 3,
                urgencyLevel: 'urgent',
                requiredBy: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
                patientInfo: {
                    age: 32,
                    gender: 'F',
                    procedure: 'Emergency Surgery'
                },
                notes: 'Emergency case - patient in critical condition'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.urgencyLevel).toBe('urgent')
            expect(data.data.status).toBe('pending')
        })

        it('should create emergency blood request and trigger notifications', async () => {
            const requestData = {
                bloodType: 'O+',
                unitsRequested: 10,
                urgencyLevel: 'emergency',
                requiredBy: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
                patientInfo: {
                    age: 28,
                    gender: 'M',
                    procedure: 'Trauma Surgery'
                },
                notes: 'Critical trauma case - immediate blood needed'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.urgencyLevel).toBe('emergency')
            expect(data.message).toContain('Emergency notifications sent')
        })

        it('should reject request with invalid blood type', async () => {
            const requestData = {
                bloodType: 'INVALID',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('VALIDATION_ERROR')
        })

        it('should reject request from non-facility user', async () => {
            const requestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
            }

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('FORBIDDEN')
        })

        it('should reject request with past required date', async () => {
            const requestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests', requestData, headers)
            const response = await requestsPost(request)
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('VALIDATION_ERROR')
        })
    })

    describe('GET /api/requests', () => {
        let testRequest: any

        beforeEach(async () => {
            testRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                status: 'pending'
            })
        })

        it('should get facility requests for facility user', async () => {
            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?page=1&limit=10', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].id).toBe(testRequest.id)
            expect(data.data[0].facilityId).toBe(testFacility.id)
        })

        it('should get all requests for admin user', async () => {
            // Create request from another facility
            const otherFacility = await testManager.createTestFacility({
                name: 'Other Hospital',
                email: 'other@hospital.com'
            })
            await testManager.createTestBloodRequest(otherFacility.id, {
                bloodType: 'A+',
                unitsRequested: 3
            })

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?page=1&limit=10', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeGreaterThanOrEqual(2)
        })

        it('should filter requests by blood type', async () => {
            // Create A+ request
            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'A+',
                unitsRequested: 3
            })

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?bloodType=O%2B', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].bloodType).toBe('O+')
        })

        it('should filter requests by urgency level', async () => {
            // Create urgent request
            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'O+',
                unitsRequested: 2,
                urgencyLevel: 'urgent'
            })

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?urgencyLevel=urgent', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].urgencyLevel).toBe('urgent')
        })

        it('should filter requests by status', async () => {
            // Create fulfilled request
            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'A+',
                unitsRequested: 2,
                status: 'fulfilled'
            })

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?status=pending', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(data.data[0].status).toBe('pending')
        })

        it('should handle pagination', async () => {
            // Create multiple requests
            for (let i = 0; i < 5; i++) {
                await testManager.createTestBloodRequest(testFacility.id, {
                    bloodType: 'O+',
                    unitsRequested: i + 1
                })
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', '/api/requests?page=1&limit=3', undefined, headers)
            const response = await requestsGet(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.length).toBeLessThanOrEqual(3)
        })
    })

    describe('GET /api/requests/[id]', () => {
        let testRequest: any

        beforeEach(async () => {
            testRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine'
            })
        })

        it('should get request details successfully', async () => {
            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('GET', `/api/requests/${testRequest.id}`, undefined, headers)
            const response = await requestGet(request, { params: { id: testRequest.id } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.id).toBe(testRequest.id)
            expect(data.data.bloodType).toBe('O+')
            expect(data.data.facility.name).toBe(testFacility.name)
        })

        it('should reject access to other facility request', async () => {
            // Create another facility and user
            const { user: otherUser } = await testManager.createTestUser({
                email: 'other@facility.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const otherFacility = await testManager.createTestFacility({
                name: 'Other Hospital',
                email: 'other@facility.com'
            })

            const headers = await getAuthHeaders('other@facility.com', 'SecurePass123!')
            const request = createMockRequest('GET', `/api/requests/${testRequest.id}`, undefined, headers)
            const response = await requestGet(request, { params: { id: testRequest.id } })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('FORBIDDEN')
        })
    })

    describe('PUT /api/requests/[id]', () => {
        let testRequest: any

        beforeEach(async () => {
            testRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                status: 'pending'
            })
        })

        it('should fulfill request successfully', async () => {
            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id,
                notes: 'Request fulfilled successfully'
            }

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/requests/${testRequest.id}`, fulfillmentData, headers)
            const response = await requestPut(request, { params: { id: testRequest.id } })
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.status).toBe('fulfilled')
            expect(data.data.fulfilledBy).toBe(testBloodBank.id)
            expect(data.data.fulfilledAt).toBeDefined()
        })

        it('should update inventory when fulfilling request', async () => {
            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id
            }

            // Check initial inventory
            const initialInventory = await testManager.testSupabase
                .from('blood_inventory')
                .select('units_available')
                .eq('blood_bank_id', testBloodBank.id)
                .eq('blood_type', 'O+')
                .single()

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/requests/${testRequest.id}`, fulfillmentData, headers)
            const response = await requestPut(request, { params: { id: testRequest.id } })

            expect(response.status).toBe(200)

            // Check updated inventory
            const updatedInventory = await testManager.testSupabase
                .from('blood_inventory')
                .select('units_available')
                .eq('blood_bank_id', testBloodBank.id)
                .eq('blood_type', 'O+')
                .single()

            expect(updatedInventory.data.units_available).toBe(
                initialInventory.data.units_available - testRequest.unitsRequested
            )
        })

        it('should reject fulfillment with insufficient inventory', async () => {
            // Create request for more units than available
            const largeRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'A+',
                unitsRequested: 100, // More than the 30 available
                urgencyLevel: 'routine'
            })

            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id
            }

            const headers = await getAuthHeaders('admin@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/requests/${largeRequest.id}`, fulfillmentData, headers)
            const response = await requestPut(request, { params: { id: largeRequest.id } })
            const data = await response.json()

            expect(response.status).toBe(400)
            expect(data.success).toBe(false)
            expect(data.error.message).toContain('insufficient inventory')
        })

        it('should reject unauthorized fulfillment', async () => {
            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('PUT', `/api/requests/${testRequest.id}`, fulfillmentData, headers)
            const response = await requestPut(request, { params: { id: testRequest.id } })
            const data = await response.json()

            expect(response.status).toBe(403)
            expect(data.success).toBe(false)
            expect(data.error.code).toBe('FORBIDDEN')
        })
    })

    describe('POST /api/requests/urgent', () => {
        it('should handle urgent request and send notifications', async () => {
            const urgentData = {
                bloodType: 'O+',
                unitsRequested: 8,
                requiredBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
                patientInfo: {
                    age: 35,
                    gender: 'F',
                    procedure: 'Emergency Surgery'
                },
                notes: 'Critical patient needs immediate blood'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests/urgent', urgentData, headers)
            const response = await urgentPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.urgencyLevel).toBe('urgent')
            expect(data.message).toContain('Urgent notifications sent')
        })

        it('should escalate to emergency if very urgent', async () => {
            const emergencyData = {
                bloodType: 'O+',
                unitsRequested: 10,
                requiredBy: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour
                patientInfo: {
                    age: 25,
                    gender: 'M',
                    procedure: 'Trauma Surgery'
                },
                notes: 'Life-threatening emergency'
            }

            const headers = await getAuthHeaders('facility@test.com', 'SecurePass123!')
            const request = createMockRequest('POST', '/api/requests/urgent', emergencyData, headers)
            const response = await urgentPost(request)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data.urgencyLevel).toBe('emergency')
            expect(data.message).toContain('Emergency notifications sent')
        })
    })
})