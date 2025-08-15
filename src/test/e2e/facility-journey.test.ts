import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestDataManager, createMockRequest, getAuthHeaders } from '../helpers/test-db'
import { POST as registerPost } from '@/app/api/auth/register/route'
import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as requestsPost, GET as requestsGet } from '@/app/api/requests/route'
import { GET as requestGet, PUT as requestPut } from '@/app/api/requests/[id]/route'
import { POST as urgentPost } from '@/app/api/requests/urgent/route'
import { GET as bloodbanksGet } from '@/app/api/bloodbanks/route'

describe('Healthcare Facility User Journey E2E Tests', () => {
    let testManager: TestDataManager
    let testBloodBank: any
    let adminUser: any

    beforeEach(async () => {
        testManager = new TestDataManager()

        // Create blood bank with inventory
        testBloodBank = await testManager.createTestBloodBank({
            name: 'Central Blood Bank',
            capacity: 50
        })

        // Create comprehensive inventory
        const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
        for (const bloodType of bloodTypes) {
            await testManager.createTestInventory(testBloodBank.id, {
                bloodType,
                unitsAvailable: 25,
                minimumThreshold: 5
            })
        }

        // Create admin user for fulfillment
        const { user } = await testManager.createTestUser({
            email: 'admin@bloodbank.com',
            password: 'SecurePass123!',
            role: 'admin'
        })
        adminUser = user
    })

    afterEach(async () => {
        await testManager.cleanup()
    })

    describe('Facility Registration and Blood Request Journey', () => {
        it('should complete facility registration and first blood request', async () => {
            // Step 1: Register new healthcare facility
            const registrationData = {
                email: 'emergency@hospital.com',
                password: 'SecurePass123!',
                role: 'facility',
                profile: {
                    name: 'Emergency General Hospital',
                    phone: '555-0911',
                    facilityType: 'hospital',
                    licenseNumber: 'HOSP-2024-001',
                    address: {
                        street: '100 Emergency Ave',
                        city: 'Medical City',
                        state: 'MC',
                        zipCode: '54321'
                    },
                    departments: ['Emergency', 'Surgery', 'ICU', 'Trauma'],
                    capacity: 200
                }
            }

            const registerRequest = createMockRequest('POST', '/api/auth/register', registrationData)
            const registerResponse = await registerPost(registerRequest)
            const registerData = await registerResponse.json()

            expect(registerResponse.status).toBe(201)
            expect(registerData.success).toBe(true)
            expect(registerData.data.user.email).toBe(registrationData.email)
            expect(registerData.data.profile.name).toBe(registrationData.profile.name)
            expect(registerData.data.profile.facilityType).toBe('hospital')

            // Step 2: Login with facility credentials
            const loginData = {
                email: 'emergency@hospital.com',
                password: 'SecurePass123!'
            }

            const loginRequest = createMockRequest('POST', '/api/auth/login', loginData)
            const loginResponse = await loginPost(loginRequest)
            const loginResult = await loginResponse.json()

            expect(loginResponse.status).toBe(200)
            expect(loginResult.success).toBe(true)
            expect(loginResult.data.user.role).toBe('facility')

            // Step 3: Check available blood banks
            const headers = await getAuthHeaders('emergency@hospital.com', 'SecurePass123!')
            const bloodBanksRequest = createMockRequest('GET', '/api/bloodbanks', undefined, headers)
            const bloodBanksResponse = await bloodbanksGet(bloodBanksRequest)
            const bloodBanksData = await bloodBanksResponse.json()

            expect(bloodBanksResponse.status).toBe(200)
            expect(bloodBanksData.success).toBe(true)
            expect(bloodBanksData.data.length).toBeGreaterThan(0)
            expect(bloodBanksData.data[0].name).toBe(testBloodBank.name)

            // Step 4: Create routine blood request
            const routineRequestData = {
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'routine',
                requiredBy: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 3 days
                patientInfo: {
                    age: 45,
                    gender: 'M',
                    procedure: 'Elective Surgery',
                    diagnosis: 'Hernia repair'
                },
                notes: 'Scheduled surgery for next week'
            }

            const requestRequest = createMockRequest('POST', '/api/requests', routineRequestData, headers)
            const requestResponse = await requestsPost(requestRequest)
            const requestResult = await requestResponse.json()

            expect(requestResponse.status).toBe(200)
            expect(requestResult.success).toBe(true)
            expect(requestResult.data.bloodType).toBe('O+')
            expect(requestResult.data.urgencyLevel).toBe('routine')
            expect(requestResult.data.status).toBe('pending')

            // Step 5: View facility's blood requests
            const myRequestsRequest = createMockRequest('GET', '/api/requests', undefined, headers)
            const myRequestsResponse = await requestsGet(myRequestsRequest)
            const myRequestsData = await myRequestsResponse.json()

            expect(myRequestsResponse.status).toBe(200)
            expect(myRequestsData.success).toBe(true)
            expect(myRequestsData.data).toHaveLength(1)
            expect(myRequestsData.data[0].bloodType).toBe('O+')
            expect(myRequestsData.data[0].facility.name).toBe(registrationData.profile.name)

            // Step 6: Get specific request details
            const requestId = requestResult.data.id
            const requestDetailRequest = createMockRequest('GET', `/api/requests/${requestId}`, undefined, headers)
            const requestDetailResponse = await requestGet(requestDetailRequest, { params: { id: requestId } })
            const requestDetailData = await requestDetailResponse.json()

            expect(requestDetailResponse.status).toBe(200)
            expect(requestDetailData.success).toBe(true)
            expect(requestDetailData.data.id).toBe(requestId)
            expect(requestDetailData.data.patientInfo.procedure).toBe('Elective Surgery')
        })

        it('should handle urgent blood request with notifications', async () => {
            // Create facility
            const { user } = await testManager.createTestUser({
                email: 'trauma@hospital.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const facility = await testManager.createTestFacility({
                name: 'Trauma Center',
                email: 'trauma@hospital.com'
            })

            const headers = await getAuthHeaders('trauma@hospital.com', 'SecurePass123!')

            // Create urgent blood request
            const urgentRequestData = {
                bloodType: 'A-',
                unitsRequested: 8,
                urgencyLevel: 'urgent',
                requiredBy: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
                patientInfo: {
                    age: 28,
                    gender: 'F',
                    procedure: 'Emergency Surgery',
                    diagnosis: 'Motor vehicle accident with internal bleeding'
                },
                notes: 'Patient in critical condition, surgery scheduled in 4 hours'
            }

            const urgentRequest = createMockRequest('POST', '/api/requests/urgent', urgentRequestData, headers)
            const urgentResponse = await urgentPost(urgentRequest)
            const urgentResult = await urgentResponse.json()

            expect(urgentResponse.status).toBe(200)
            expect(urgentResult.success).toBe(true)
            expect(urgentResult.data.urgencyLevel).toBe('urgent')
            expect(urgentResult.message).toContain('Urgent notifications sent')

            // Verify request appears in facility's requests
            const requestsRequest = createMockRequest('GET', '/api/requests?urgencyLevel=urgent', undefined, headers)
            const requestsResponse = await requestsGet(requestsRequest)
            const requestsData = await requestsResponse.json()

            expect(requestsResponse.status).toBe(200)
            expect(requestsData.data).toHaveLength(1)
            expect(requestsData.data[0].urgencyLevel).toBe('urgent')
        })

        it('should handle emergency blood request escalation', async () => {
            // Create facility
            const { user } = await testManager.createTestUser({
                email: 'emergency@trauma.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const facility = await testManager.createTestFacility({
                name: 'Emergency Trauma Center',
                email: 'emergency@trauma.com'
            })

            const headers = await getAuthHeaders('emergency@trauma.com', 'SecurePass123!')

            // Create emergency blood request (very urgent timing)
            const emergencyRequestData = {
                bloodType: 'O-',
                unitsRequested: 12,
                urgencyLevel: 'urgent',
                requiredBy: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 90 minutes
                patientInfo: {
                    age: 35,
                    gender: 'M',
                    procedure: 'Emergency Trauma Surgery',
                    diagnosis: 'Massive hemorrhage from gunshot wound'
                },
                notes: 'Life-threatening emergency - patient losing blood rapidly'
            }

            const emergencyRequest = createMockRequest('POST', '/api/requests/urgent', emergencyRequestData, headers)
            const emergencyResponse = await urgentPost(emergencyRequest)
            const emergencyResult = await emergencyResponse.json()

            expect(emergencyResponse.status).toBe(200)
            expect(emergencyResult.success).toBe(true)
            expect(emergencyResult.data.urgencyLevel).toBe('emergency') // Should be escalated
            expect(emergencyResult.message).toContain('Emergency notifications sent')
        })
    })

    describe('Blood Request Management and Fulfillment Journey', () => {
        let facilityUser: any
        let testFacility: any
        let pendingRequest: any

        beforeEach(async () => {
            // Create facility and user
            const { user } = await testManager.createTestUser({
                email: 'requests@hospital.com',
                password: 'SecurePass123!',
                role: 'facility'
            })
            facilityUser = user

            testFacility = await testManager.createTestFacility({
                name: 'Request Hospital',
                email: 'requests@hospital.com'
            })

            // Create pending blood request
            pendingRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'B+',
                unitsRequested: 6,
                urgencyLevel: 'routine',
                status: 'pending'
            })
        })

        it('should track request from creation to fulfillment', async () => {
            const facilityHeaders = await getAuthHeaders('requests@hospital.com', 'SecurePass123!')
            const adminHeaders = await getAuthHeaders('admin@bloodbank.com', 'SecurePass123!')

            // Step 1: Facility views their pending requests
            const pendingRequestsRequest = createMockRequest('GET', '/api/requests?status=pending', undefined, facilityHeaders)
            const pendingRequestsResponse = await requestsGet(pendingRequestsRequest)
            const pendingRequestsData = await pendingRequestsResponse.json()

            expect(pendingRequestsResponse.status).toBe(200)
            expect(pendingRequestsData.data).toHaveLength(1)
            expect(pendingRequestsData.data[0].status).toBe('pending')

            // Step 2: Admin views all pending requests
            const allPendingRequest = createMockRequest('GET', '/api/requests?status=pending', undefined, adminHeaders)
            const allPendingResponse = await requestsGet(allPendingRequest)
            const allPendingData = await allPendingResponse.json()

            expect(allPendingResponse.status).toBe(200)
            expect(allPendingData.data.length).toBeGreaterThanOrEqual(1)

            // Step 3: Admin fulfills the request
            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id,
                notes: 'Request fulfilled from central inventory'
            }

            const fulfillRequest = createMockRequest('PUT', `/api/requests/${pendingRequest.id}`, fulfillmentData, adminHeaders)
            const fulfillResponse = await requestPut(fulfillRequest, { params: { id: pendingRequest.id } })
            const fulfillResult = await fulfillResponse.json()

            expect(fulfillResponse.status).toBe(200)
            expect(fulfillResult.success).toBe(true)
            expect(fulfillResult.data.status).toBe('fulfilled')
            expect(fulfillResult.data.fulfilledBy).toBe(testBloodBank.id)
            expect(fulfillResult.data.fulfilledAt).toBeDefined()

            // Step 4: Facility sees updated request status
            const updatedRequestRequest = createMockRequest('GET', `/api/requests/${pendingRequest.id}`, undefined, facilityHeaders)
            const updatedRequestResponse = await requestGet(updatedRequestRequest, { params: { id: pendingRequest.id } })
            const updatedRequestData = await updatedRequestResponse.json()

            expect(updatedRequestResponse.status).toBe(200)
            expect(updatedRequestData.data.status).toBe('fulfilled')
            expect(updatedRequestData.data.bloodBank.name).toBe(testBloodBank.name)

            // Step 5: Verify inventory was updated
            const inventoryCheck = await testManager.testSupabase
                .from('blood_inventory')
                .select('units_available')
                .eq('blood_bank_id', testBloodBank.id)
                .eq('blood_type', 'B+')
                .single()

            expect(inventoryCheck.data.units_available).toBe(25 - 6) // 25 initial - 6 requested
        })

        it('should handle request filtering and search', async () => {
            const headers = await getAuthHeaders('requests@hospital.com', 'SecurePass123!')

            // Create multiple requests with different properties
            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'A+',
                unitsRequested: 3,
                urgencyLevel: 'urgent',
                status: 'pending'
            })

            await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'O-',
                unitsRequested: 8,
                urgencyLevel: 'emergency',
                status: 'fulfilled'
            })

            // Filter by blood type
            const bloodTypeFilterRequest = createMockRequest('GET', '/api/requests?bloodType=A%2B', undefined, headers)
            const bloodTypeFilterResponse = await requestsGet(bloodTypeFilterRequest)
            const bloodTypeFilterData = await bloodTypeFilterResponse.json()

            expect(bloodTypeFilterResponse.status).toBe(200)
            expect(bloodTypeFilterData.data).toHaveLength(1)
            expect(bloodTypeFilterData.data[0].bloodType).toBe('A+')

            // Filter by urgency level
            const urgencyFilterRequest = createMockRequest('GET', '/api/requests?urgencyLevel=emergency', undefined, headers)
            const urgencyFilterResponse = await requestsGet(urgencyFilterRequest)
            const urgencyFilterData = await urgencyFilterResponse.json()

            expect(urgencyFilterResponse.status).toBe(200)
            expect(urgencyFilterData.data).toHaveLength(1)
            expect(urgencyFilterData.data[0].urgencyLevel).toBe('emergency')

            // Filter by status
            const statusFilterRequest = createMockRequest('GET', '/api/requests?status=fulfilled', undefined, headers)
            const statusFilterResponse = await requestsGet(statusFilterRequest)
            const statusFilterData = await statusFilterResponse.json()

            expect(statusFilterResponse.status).toBe(200)
            expect(statusFilterData.data).toHaveLength(1)
            expect(statusFilterData.data[0].status).toBe('fulfilled')

            // Test pagination
            const paginationRequest = createMockRequest('GET', '/api/requests?page=1&limit=2', undefined, headers)
            const paginationResponse = await requestsGet(paginationRequest)
            const paginationData = await paginationResponse.json()

            expect(paginationResponse.status).toBe(200)
            expect(paginationData.data.length).toBeLessThanOrEqual(2)
        })

        it('should handle insufficient inventory scenario', async () => {
            const adminHeaders = await getAuthHeaders('admin@bloodbank.com', 'SecurePass123!')

            // Create request for more units than available
            const largeRequest = await testManager.createTestBloodRequest(testFacility.id, {
                bloodType: 'AB-',
                unitsRequested: 50, // More than the 25 available
                urgencyLevel: 'urgent',
                status: 'pending'
            })

            // Try to fulfill with insufficient inventory
            const fulfillmentData = {
                status: 'fulfilled',
                fulfilledBy: testBloodBank.id
            }

            const fulfillRequest = createMockRequest('PUT', `/api/requests/${largeRequest.id}`, fulfillmentData, adminHeaders)
            const fulfillResponse = await requestPut(fulfillRequest, { params: { id: largeRequest.id } })
            const fulfillResult = await fulfillResponse.json()

            expect(fulfillResponse.status).toBe(400)
            expect(fulfillResult.success).toBe(false)
            expect(fulfillResult.error.message).toContain('insufficient inventory')

            // Verify request status unchanged
            const facilityHeaders = await getAuthHeaders('requests@hospital.com', 'SecurePass123!')
            const statusCheckRequest = createMockRequest('GET', `/api/requests/${largeRequest.id}`, undefined, facilityHeaders)
            const statusCheckResponse = await requestGet(statusCheckRequest, { params: { id: largeRequest.id } })
            const statusCheckData = await statusCheckResponse.json()

            expect(statusCheckResponse.status).toBe(200)
            expect(statusCheckData.data.status).toBe('pending') // Should remain pending
        })

        it('should prevent unauthorized access to other facility requests', async () => {
            // Create another facility and user
            const { user: otherUser } = await testManager.createTestUser({
                email: 'other@facility.com',
                password: 'SecurePass123!',
                role: 'facility'
            })

            const otherFacility = await testManager.createTestFacility({
                name: 'Other Facility',
                email: 'other@facility.com'
            })

            const otherHeaders = await getAuthHeaders('other@facility.com', 'SecurePass123!')

            // Try to access original facility's request
            const unauthorizedRequest = createMockRequest('GET', `/api/requests/${pendingRequest.id}`, undefined, otherHeaders)
            const unauthorizedResponse = await requestGet(unauthorizedRequest, { params: { id: pendingRequest.id } })
            const unauthorizedData = await unauthorizedResponse.json()

            expect(unauthorizedResponse.status).toBe(403)
            expect(unauthorizedData.success).toBe(false)
            expect(unauthorizedData.error.code).toBe('FORBIDDEN')

            // Verify other facility only sees their own requests
            const ownRequestsRequest = createMockRequest('GET', '/api/requests', undefined, otherHeaders)
            const ownRequestsResponse = await requestsGet(ownRequestsRequest)
            const ownRequestsData = await ownRequestsResponse.json()

            expect(ownRequestsResponse.status).toBe(200)
            expect(ownRequestsData.data).toHaveLength(0) // No requests for new facility
        })
    })
})