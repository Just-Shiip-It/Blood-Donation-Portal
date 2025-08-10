import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    createBloodRequest,
    getBloodRequestById,
    fulfillBloodRequest,
    cancelBloodRequest,
    findInventoryMatches,
    getUrgentBloodRequests
} from '../blood-request'
import { db } from '@/lib/db'
import { bloodRequestSchema } from '@/lib/db/schema'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        transaction: vi.fn()
    }
}))

const mockDb = vi.mocked(db)

describe('Blood Request Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('createBloodRequest', () => {
        it('should create a blood request successfully', async () => {
            const mockRequest = {
                id: 'request-1',
                facilityId: 'facility-1',
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'urgent',
                patientInfo: { age: 45, gender: 'male' },
                requiredBy: new Date('2024-12-31'),
                status: 'pending',
                notes: 'Emergency surgery',
                requestDate: new Date()
            }

            const mockInsert = {
                values: vi.fn().mockReturnThis(),
                returning: vi.fn().mockResolvedValue([mockRequest])
            }

            mockDb.insert.mockReturnValue(mockInsert)

            const requestData = {
                bloodType: 'O+' as const,
                unitsRequested: 5,
                urgencyLevel: 'urgent' as const,
                patientInfo: { age: 45, gender: 'male' as const },
                requiredBy: '2024-12-31',
                notes: 'Emergency surgery'
            }

            const result = await createBloodRequest('facility-1', requestData)

            expect(mockDb.insert).toHaveBeenCalledWith(bloodRequestSchema)
            expect(mockInsert.values).toHaveBeenCalledWith({
                facilityId: 'facility-1',
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'urgent',
                patientInfo: { age: 45, gender: 'male' },
                requiredBy: new Date('2024-12-31'),
                status: 'pending',
                notes: 'Emergency surgery',
                requestDate: expect.any(Date)
            })
            expect(result).toEqual(mockRequest)
        })

        it('should handle database errors', async () => {
            const mockInsert = {
                values: vi.fn().mockReturnThis(),
                returning: vi.fn().mockRejectedValue(new Error('Database error'))
            }

            mockDb.insert.mockReturnValue(mockInsert)

            const requestData = {
                bloodType: 'A+' as const,
                unitsRequested: 2,
                urgencyLevel: 'routine' as const,
                requiredBy: '2024-12-31'
            }

            await expect(createBloodRequest('facility-1', requestData))
                .rejects.toThrow('Failed to create blood request')
        })
    })

    describe('getBloodRequestById', () => {
        it('should return blood request with facility and blood bank details', async () => {
            const mockResult = [{
                id: 'request-1',
                facilityId: 'facility-1',
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'urgent',
                patientInfo: null,
                requestDate: new Date(),
                requiredBy: new Date('2024-12-31'),
                status: 'pending',
                fulfilledBy: null,
                fulfilledAt: null,
                notes: null,
                facilityName: 'City Hospital',
                facilityType: 'hospital',
                bloodBankName: null
            }]

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                leftJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue(mockResult)
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getBloodRequestById('request-1')

            expect(result).toEqual({
                id: 'request-1',
                facilityId: 'facility-1',
                bloodType: 'O+',
                unitsRequested: 5,
                urgencyLevel: 'urgent',
                patientInfo: null,
                requestDate: expect.any(Date),
                requiredBy: expect.any(Date),
                status: 'pending',
                facility: {
                    id: 'facility-1',
                    name: 'City Hospital',
                    facilityType: 'hospital'
                }
            })
        })

        it('should return null if request not found', async () => {
            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                leftJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getBloodRequestById('nonexistent')
            expect(result).toBeNull()
        })
    })

    describe('fulfillBloodRequest', () => {
        it('should fulfill blood request and update inventory', async () => {
            const mockRequest = {
                id: 'request-1',
                facilityId: 'facility-1',
                bloodType: 'O+',
                unitsRequested: 5,
                status: 'pending'
            }

            const mockInventory = {
                bloodBankId: 'bank-1',
                bloodType: 'O+',
                unitsAvailable: 10,
                unitsReserved: 2
            }

            const mockUpdatedRequest = {
                ...mockRequest,
                status: 'fulfilled',
                fulfilledBy: 'bank-1',
                fulfilledAt: new Date()
            }

            const mockTransaction = vi.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn(),
                    update: vi.fn()
                }

                // Mock request select
                mockTx.select.mockReturnValueOnce({
                    from: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue([mockRequest])
                })

                // Mock inventory select
                mockTx.select.mockReturnValueOnce({
                    from: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue([mockInventory])
                })

                // Mock inventory update
                mockTx.update.mockReturnValueOnce({
                    set: vi.fn().mockReturnThis(),
                    where: vi.fn().mockResolvedValue(undefined)
                })

                // Mock request update
                mockTx.update.mockReturnValueOnce({
                    set: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    returning: vi.fn().mockResolvedValue([mockUpdatedRequest])
                })

                return callback(mockTx)
            })

            mockDb.transaction = mockTransaction

            const fulfillmentData = {
                bloodBankId: 'bank-1',
                unitsProvided: 5,
                notes: 'Fulfilled successfully'
            }

            const result = await fulfillBloodRequest('request-1', fulfillmentData)

            expect(result).toEqual(mockUpdatedRequest)
            expect(mockTransaction).toHaveBeenCalled()
        })

        it('should throw error if insufficient inventory', async () => {
            const mockRequest = {
                id: 'request-1',
                bloodType: 'O+',
                status: 'pending'
            }

            const mockInventory = {
                bloodBankId: 'bank-1',
                bloodType: 'O+',
                unitsAvailable: 2, // Less than requested
                unitsReserved: 0
            }

            const mockTransaction = vi.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn()
                }

                // Mock request select
                mockTx.select.mockReturnValueOnce({
                    from: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue([mockRequest])
                })

                // Mock inventory select
                mockTx.select.mockReturnValueOnce({
                    from: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue([mockInventory])
                })

                return callback(mockTx)
            })

            mockDb.transaction = mockTransaction

            const fulfillmentData = {
                bloodBankId: 'bank-1',
                unitsProvided: 5
            }

            await expect(fulfillBloodRequest('request-1', fulfillmentData))
                .rejects.toThrow('Failed to fulfill blood request')
        })

        it('should throw error if request already processed', async () => {
            const mockRequest = {
                id: 'request-1',
                status: 'fulfilled' // Already processed
            }

            const mockTransaction = vi.fn().mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn()
                }

                // Mock request select
                mockTx.select.mockReturnValueOnce({
                    from: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue([mockRequest])
                })

                return callback(mockTx)
            })

            mockDb.transaction = mockTransaction

            const fulfillmentData = {
                bloodBankId: 'bank-1',
                unitsProvided: 5
            }

            await expect(fulfillBloodRequest('request-1', fulfillmentData))
                .rejects.toThrow('Failed to fulfill blood request')
        })
    })

    describe('findInventoryMatches', () => {
        it('should find compatible blood types and sort by priority', async () => {
            const mockResults = [
                {
                    bloodBankId: 'bank-1',
                    bloodBankName: 'Central Blood Bank',
                    bloodType: 'O+', // Exact match
                    unitsAvailable: 15,
                    coordinates: { lat: 40.7128, lng: -74.0060 }
                },
                {
                    bloodBankId: 'bank-2',
                    bloodBankName: 'Regional Blood Bank',
                    bloodType: 'O-', // Compatible
                    unitsAvailable: 8,
                    coordinates: { lat: 40.7589, lng: -73.9851 }
                }
            ]

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                innerJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockResults)
            }

            mockDb.select.mockReturnValue(mockSelect)

            const facilityCoordinates = { lat: 40.7128, lng: -74.0060 }
            const result = await findInventoryMatches('O+', 5, facilityCoordinates)

            expect(result).toHaveLength(2)
            expect(result[0]).toEqual({
                bloodBankId: 'bank-1',
                bloodBankName: 'Central Blood Bank',
                bloodType: 'O+',
                unitsAvailable: 15,
                coordinates: { lat: 40.7128, lng: -74.0060 },
                distance: 0 // Same coordinates
            })
            expect(result[1].distance).toBeGreaterThan(0)
        })

        it('should work without facility coordinates', async () => {
            const mockResults = [
                {
                    bloodBankId: 'bank-1',
                    bloodBankName: 'Central Blood Bank',
                    bloodType: 'A+',
                    unitsAvailable: 10,
                    coordinates: null
                }
            ]

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                innerJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockResults)
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await findInventoryMatches('A+', 3)

            expect(result).toHaveLength(1)
            expect(result[0].distance).toBeUndefined()
        })
    })

    describe('getUrgentBloodRequests', () => {
        it('should return emergency and urgent requests sorted by priority', async () => {
            const mockResults = [
                {
                    id: 'request-1',
                    facilityId: 'facility-1',
                    bloodType: 'O-',
                    unitsRequested: 3,
                    urgencyLevel: 'emergency',
                    patientInfo: null,
                    requestDate: new Date(),
                    requiredBy: new Date('2024-12-25'),
                    status: 'pending',
                    fulfilledBy: null,
                    fulfilledAt: null,
                    notes: null,
                    facilityName: 'Emergency Hospital',
                    facilityType: 'emergency'
                },
                {
                    id: 'request-2',
                    facilityId: 'facility-2',
                    bloodType: 'A+',
                    unitsRequested: 2,
                    urgencyLevel: 'urgent',
                    patientInfo: null,
                    requestDate: new Date(),
                    requiredBy: new Date('2024-12-26'),
                    status: 'pending',
                    fulfilledBy: null,
                    fulfilledAt: null,
                    notes: null,
                    facilityName: 'City Hospital',
                    facilityType: 'hospital'
                }
            ]

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                leftJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockResults)
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getUrgentBloodRequests()

            expect(result).toHaveLength(2)
            expect(result[0].urgencyLevel).toBe('emergency')
            expect(result[1].urgencyLevel).toBe('urgent')
            expect(result[0].facility?.name).toBe('Emergency Hospital')
        })

        it('should return empty array if no urgent requests', async () => {
            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                leftJoin: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue([])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getUrgentBloodRequests()
            expect(result).toEqual([])
        })
    })

    describe('cancelBloodRequest', () => {
        it('should cancel blood request with reason', async () => {
            const mockCancelledRequest = {
                id: 'request-1',
                status: 'cancelled',
                notes: 'Patient condition improved'
            }

            const mockUpdate = {
                set: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                returning: vi.fn().mockResolvedValue([mockCancelledRequest])
            }

            mockDb.update.mockReturnValue(mockUpdate)

            const result = await cancelBloodRequest('request-1', 'Patient condition improved')

            expect(mockDb.update).toHaveBeenCalledWith(bloodRequestSchema)
            expect(mockUpdate.set).toHaveBeenCalledWith({
                status: 'cancelled',
                notes: 'Patient condition improved'
            })
            expect(result).toEqual(mockCancelledRequest)
        })
    })
})