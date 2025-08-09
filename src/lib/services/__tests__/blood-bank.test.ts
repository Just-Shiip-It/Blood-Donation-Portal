/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BloodBankService } from '../blood-bank'
import { db } from '@/lib/db'
import { bloodInventorySchema } from '@/lib/db/schema'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}))

const mockDb = vi.mocked(db)

describe('BloodBankService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.resetAllMocks()
    })

    describe('createBloodBank', () => {
        it('should create a blood bank with initial inventory', async () => {
            const mockBloodBankData = {
                name: 'Test Blood Bank',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US'
                },
                phone: '555-0123',
                email: 'test@bloodbank.com',
                capacity: 100
            }

            const mockBloodBankId = 'test-blood-bank-id'

            // Mock blood bank creation
            mockDb.insert.mockReturnValueOnce({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([{ id: mockBloodBankId }])
                })
            } as any)

            // Mock inventory creation
            mockDb.insert.mockReturnValueOnce({
                values: vi.fn().mockResolvedValue(undefined)
            } as any)

            const result = await BloodBankService.createBloodBank(mockBloodBankData)

            expect(result).toBe(mockBloodBankId)
            expect(mockDb.insert).toHaveBeenCalledTimes(2) // Once for blood bank, once for inventory
        })

        it('should handle creation errors', async () => {
            const mockBloodBankData = {
                name: 'Test Blood Bank',
                address: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US'
                },
                phone: '555-0123',
                email: 'test@bloodbank.com',
                capacity: 100
            }

            mockDb.insert.mockImplementation(() => {
                throw new Error('Database error')
            })

            await expect(BloodBankService.createBloodBank(mockBloodBankData))
                .rejects.toThrow('Failed to create blood bank')
        })
    })

    describe('getBloodBankById', () => {
        it('should return blood bank with inventory', async () => {
            const mockBloodBankId = 'test-blood-bank-id'
            const mockBloodBank = {
                id: mockBloodBankId,
                name: 'Test Blood Bank',
                address: { street: '123 Test St', city: 'Test City', state: 'TS', zipCode: '12345' },
                phone: '555-0123',
                email: 'test@bloodbank.com',
                capacity: 100,
                isActive: true,
                coordinates: null,
                operatingHours: null,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            const mockInventory = [
                {
                    id: 'inv-1',
                    bloodType: 'A+',
                    unitsAvailable: 10,
                    unitsReserved: 2,
                    minimumThreshold: 5,
                    expirationDate: null,
                    lastUpdated: new Date()
                },
                {
                    id: 'inv-2',
                    bloodType: 'O-',
                    unitsAvailable: 15,
                    unitsReserved: 0,
                    minimumThreshold: 10,
                    expirationDate: null,
                    lastUpdated: new Date()
                }
            ]

            // Mock blood bank query
            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockBloodBank])
                    })
                })
            } as any)

            // Mock inventory query
            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockInventory)
                })
            } as any)

            const result = await BloodBankService.getBloodBankById(mockBloodBankId)

            expect(result).toEqual({
                ...mockBloodBank,
                inventory: mockInventory.map(item => ({
                    id: item.id,
                    bloodType: item.bloodType,
                    unitsAvailable: item.unitsAvailable,
                    unitsReserved: item.unitsReserved,
                    minimumThreshold: item.minimumThreshold,
                    expirationDate: item.expirationDate,
                    lastUpdated: item.lastUpdated
                }))
            })
        })

        it('should return null for non-existent blood bank', async () => {
            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([])
                    })
                })
            } as any)

            const result = await BloodBankService.getBloodBankById('non-existent-id')

            expect(result).toBeNull()
        })
    })

    describe('updateInventory', () => {
        it('should update inventory for specific blood type', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const bloodType = 'A+'
            const updateData = {
                unitsAvailable: 20,
                minimumThreshold: 8
            }

            mockDb.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(undefined)
                })
            } as any)

            await BloodBankService.updateInventory(bloodBankId, bloodType, updateData)

            expect(mockDb.update).toHaveBeenCalledWith(bloodInventorySchema)
        })

        it('should handle update errors', async () => {
            mockDb.update.mockImplementation(() => {
                throw new Error('Database error')
            })

            await expect(BloodBankService.updateInventory('test-id', 'A+', { unitsAvailable: 10 }))
                .rejects.toThrow('Failed to update inventory')
        })
    })

    describe('getInventoryAlerts', () => {
        it('should return low stock alerts', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const mockInventory = [
                {
                    id: 'inv-1',
                    bloodBankId,
                    bloodType: 'A+',
                    unitsAvailable: 3, // Below threshold of 5
                    unitsReserved: 0,
                    minimumThreshold: 5,
                    expirationDate: null,
                    lastUpdated: new Date()
                },
                {
                    id: 'inv-2',
                    bloodBankId,
                    bloodType: 'O-',
                    unitsAvailable: 0, // Critical stock
                    unitsReserved: 0,
                    minimumThreshold: 10,
                    expirationDate: null,
                    lastUpdated: new Date()
                }
            ]

            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockInventory)
                })
            } as any)

            const alerts = await BloodBankService.getInventoryAlerts(bloodBankId)

            expect(alerts).toHaveLength(2)
            expect(alerts[0].alertType).toBe('low_stock')
            expect(alerts[0].bloodType).toBe('A+')
            expect(alerts[1].alertType).toBe('critical_stock')
            expect(alerts[1].bloodType).toBe('O-')
        })

        it('should return expiring soon alerts', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const expirationDate = new Date()
            expirationDate.setDate(expirationDate.getDate() + 3) // 3 days from now

            const mockInventory = [
                {
                    id: 'inv-1',
                    bloodBankId,
                    bloodType: 'B+',
                    unitsAvailable: 10,
                    unitsReserved: 0,
                    minimumThreshold: 5,
                    expirationDate: expirationDate.toISOString(),
                    lastUpdated: new Date()
                }
            ]

            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockInventory)
                })
            } as any)

            const alerts = await BloodBankService.getInventoryAlerts(bloodBankId)

            expect(alerts).toHaveLength(1)
            expect(alerts[0].alertType).toBe('expiring_soon')
            expect(alerts[0].bloodType).toBe('B+')
        })
    })

    describe('reserveBloodUnits', () => {
        it('should successfully reserve blood units when available', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const bloodType = 'A+'
            const unitsToReserve = 3

            const mockInventory = {
                id: 'inv-1',
                bloodBankId,
                bloodType,
                unitsAvailable: 10,
                unitsReserved: 2,
                minimumThreshold: 5,
                expirationDate: null,
                lastUpdated: new Date()
            }

            // Mock select query
            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockInventory])
                    })
                })
            } as any)

            // Mock update query
            mockDb.update.mockReturnValueOnce({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(undefined)
                })
            } as any)

            const result = await BloodBankService.reserveBloodUnits(bloodBankId, bloodType, unitsToReserve)

            expect(result).toBe(true)
            expect(mockDb.update).toHaveBeenCalledWith(bloodInventorySchema)
        })

        it('should return false when insufficient units available', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const bloodType = 'A+'
            const unitsToReserve = 15

            const mockInventory = {
                id: 'inv-1',
                bloodBankId,
                bloodType,
                unitsAvailable: 10, // Less than requested
                unitsReserved: 2,
                minimumThreshold: 5,
                expirationDate: null,
                lastUpdated: new Date()
            }

            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        limit: vi.fn().mockResolvedValue([mockInventory])
                    })
                })
            } as any)

            const result = await BloodBankService.reserveBloodUnits(bloodBankId, bloodType, unitsToReserve)

            expect(result).toBe(false)
            expect(mockDb.update).not.toHaveBeenCalled()
        })
    })

    describe('getInventorySummary', () => {
        it('should return correct inventory summary', async () => {
            const bloodBankId = 'test-blood-bank-id'
            const mockInventory = [
                {
                    id: 'inv-1',
                    bloodBankId,
                    bloodType: 'A+',
                    unitsAvailable: 10,
                    unitsReserved: 2,
                    minimumThreshold: 5,
                    expirationDate: null,
                    lastUpdated: new Date()
                },
                {
                    id: 'inv-2',
                    bloodBankId,
                    bloodType: 'O-',
                    unitsAvailable: 3, // Low stock
                    unitsReserved: 1,
                    minimumThreshold: 5,
                    expirationDate: null,
                    lastUpdated: new Date()
                },
                {
                    id: 'inv-3',
                    bloodBankId,
                    bloodType: 'B+',
                    unitsAvailable: 0, // Critical stock
                    unitsReserved: 0,
                    minimumThreshold: 10,
                    expirationDate: null,
                    lastUpdated: new Date()
                }
            ]

            mockDb.select.mockReturnValueOnce({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(mockInventory)
                })
            } as any)

            const summary = await BloodBankService.getInventorySummary(bloodBankId)

            expect(summary.totalUnits).toBe(16) // 10+2+3+1+0+0
            expect(summary.totalAvailable).toBe(13) // 10+3+0
            expect(summary.totalReserved).toBe(3) // 2+1+0
            expect(summary.lowStockCount).toBe(1) // O- is low
            expect(summary.criticalStockCount).toBe(1) // B+ is critical
            expect(summary.byBloodType['A+'].status).toBe('normal')
            expect(summary.byBloodType['O-'].status).toBe('low')
            expect(summary.byBloodType['B+'].status).toBe('critical')
        })
    })
})