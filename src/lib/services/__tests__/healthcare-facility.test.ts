import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    createHealthcareFacility,
    getHealthcareFacilityById,
    getHealthcareFacilityByEmail,
    updateHealthcareFacility,
    getHealthcareFacilities,
    checkHealthcareFacilityExists
} from '../healthcare-facility'
import { db } from '@/lib/db'
import { healthcareFacilitySchema } from '@/lib/db/schema'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn()
    }
}))

const mockDb = vi.mocked(db)

describe('Healthcare Facility Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('createHealthcareFacility', () => {
        it('should create a healthcare facility successfully', async () => {
            const mockFacility = {
                id: 'facility-1',
                name: 'City Hospital',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001'
                },
                phone: '555-0123',
                email: 'admin@cityhospital.com',
                licenseNumber: 'LIC123456',
                facilityType: 'hospital',
                isActive: true,
                coordinates: { lat: 40.7128, lng: -74.0060 },
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const mockInsert = {
                values: vi.fn().mockReturnThis(),
                returning: vi.fn().mockResolvedValue([mockFacility])
            }

            mockDb.insert.mockReturnValue(mockInsert)

            const facilityData = {
                name: 'City Hospital',
                address: {
                    street: '123 Main St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10001'
                },
                phone: '555-0123',
                email: 'admin@cityhospital.com',
                licenseNumber: 'LIC123456',
                facilityType: 'hospital' as const,
                coordinates: { lat: 40.7128, lng: -74.0060 }
            }

            const result = await createHealthcareFacility(facilityData)

            expect(mockDb.insert).toHaveBeenCalledWith(healthcareFacilitySchema)
            expect(mockInsert.values).toHaveBeenCalledWith({
                name: 'City Hospital',
                address: facilityData.address,
                phone: '555-0123',
                email: 'admin@cityhospital.com',
                licenseNumber: 'LIC123456',
                facilityType: 'hospital',
                coordinates: { lat: 40.7128, lng: -74.0060 },
                isActive: true,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            })
            expect(result).toEqual(mockFacility)
        })

        it('should handle database errors', async () => {
            const mockInsert = {
                values: vi.fn().mockReturnThis(),
                returning: vi.fn().mockRejectedValue(new Error('Database error'))
            }

            mockDb.insert.mockReturnValue(mockInsert)

            const facilityData = {
                name: 'Test Hospital',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345'
                },
                phone: '555-0123',
                email: 'test@hospital.com',
                licenseNumber: 'TEST123',
                facilityType: 'hospital' as const
            }

            await expect(createHealthcareFacility(facilityData))
                .rejects.toThrow('Failed to create healthcare facility')
        })
    })

    describe('getHealthcareFacilityById', () => {
        it('should return facility when found', async () => {
            const mockFacility = {
                id: 'facility-1',
                name: 'City Hospital',
                email: 'admin@cityhospital.com',
                isActive: true
            }

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([mockFacility])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getHealthcareFacilityById('facility-1')

            expect(result).toEqual(mockFacility)
        })

        it('should return null when facility not found', async () => {
            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getHealthcareFacilityById('nonexistent')
            expect(result).toBeNull()
        })
    })

    describe('getHealthcareFacilityByEmail', () => {
        it('should return facility when found by email', async () => {
            const mockFacility = {
                id: 'facility-1',
                name: 'City Hospital',
                email: 'admin@cityhospital.com',
                isActive: true
            }

            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([mockFacility])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getHealthcareFacilityByEmail('admin@cityhospital.com')

            expect(result).toEqual(mockFacility)
        })

        it('should return null when facility not found by email', async () => {
            const mockSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            mockDb.select.mockReturnValue(mockSelect)

            const result = await getHealthcareFacilityByEmail('nonexistent@email.com')
            expect(result).toBeNull()
        })
    })

    describe('updateHealthcareFacility', () => {
        it('should update facility successfully', async () => {
            const mockUpdatedFacility = {
                id: 'facility-1',
                name: 'Updated Hospital',
                email: 'updated@hospital.com',
                updatedAt: new Date()
            }

            const mockUpdate = {
                set: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                returning: vi.fn().mockResolvedValue([mockUpdatedFacility])
            }

            mockDb.update.mockReturnValue(mockUpdate)

            const updateData = {
                name: 'Updated Hospital',
                email: 'updated@hospital.com'
            }

            const result = await updateHealthcareFacility('facility-1', updateData)

            expect(mockDb.update).toHaveBeenCalledWith(healthcareFacilitySchema)
            expect(mockUpdate.set).toHaveBeenCalledWith({
                ...updateData,
                updatedAt: expect.any(Date)
            })
            expect(result).toEqual(mockUpdatedFacility)
        })

        it('should return null when facility not found', async () => {
            const mockUpdate = {
                set: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                returning: vi.fn().mockResolvedValue([])
            }

            mockDb.update.mockReturnValue(mockUpdate)

            const result = await updateHealthcareFacility('nonexistent', { name: 'Test' })
            expect(result).toBeNull()
        })
    })

    describe('getHealthcareFacilities', () => {
        it('should return paginated facilities with filters', async () => {
            const mockFacilities = [
                {
                    id: 'facility-1',
                    name: 'City Hospital',
                    facilityType: 'hospital',
                    isActive: true,
                    createdAt: new Date()
                },
                {
                    id: 'facility-2',
                    name: 'Community Clinic',
                    facilityType: 'clinic',
                    isActive: true,
                    createdAt: new Date()
                }
            ]

            // Mock count query
            const mockCountSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue([{ id: 'facility-1' }, { id: 'facility-2' }])
            }

            // Mock facilities query
            const mockFacilitiesSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockFacilities)
            }

            mockDb.select
                .mockReturnValueOnce(mockCountSelect)
                .mockReturnValueOnce(mockFacilitiesSelect)

            const result = await getHealthcareFacilities({
                facilityType: 'hospital',
                isActive: true,
                page: 1,
                limit: 10
            })

            expect(result).toEqual({
                facilities: mockFacilities,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1
            })
        })

        it('should handle search filters', async () => {
            const mockFacilities = [
                {
                    id: 'facility-1',
                    name: 'City Hospital',
                    email: 'admin@cityhospital.com'
                }
            ]

            const mockCountSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockResolvedValue([{ id: 'facility-1' }])
            }

            const mockFacilitiesSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockResolvedValue(mockFacilities)
            }

            mockDb.select
                .mockReturnValueOnce(mockCountSelect)
                .mockReturnValueOnce(mockFacilitiesSelect)

            const result = await getHealthcareFacilities({
                search: 'City',
                page: 1,
                limit: 10
            })

            expect(result.facilities).toEqual(mockFacilities)
            expect(result.total).toBe(1)
        })
    })

    describe('checkHealthcareFacilityExists', () => {
        it('should check email and license existence', async () => {
            // Mock email check - exists
            const mockEmailSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([{ id: 'facility-1' }])
            }

            // Mock license check - doesn't exist
            const mockLicenseSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            mockDb.select
                .mockReturnValueOnce(mockEmailSelect)
                .mockReturnValueOnce(mockLicenseSelect)

            const result = await checkHealthcareFacilityExists(
                'existing@hospital.com',
                'NEW123'
            )

            expect(result).toEqual({
                emailExists: true,
                licenseExists: false
            })
        })

        it('should exclude specific facility ID from check', async () => {
            const mockEmailSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            const mockLicenseSelect = {
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue([])
            }

            mockDb.select
                .mockReturnValueOnce(mockEmailSelect)
                .mockReturnValueOnce(mockLicenseSelect)

            const result = await checkHealthcareFacilityExists(
                'test@hospital.com',
                'TEST123',
                'facility-1'
            )

            expect(result).toEqual({
                emailExists: false,
                licenseExists: false
            })
        })
    })
})