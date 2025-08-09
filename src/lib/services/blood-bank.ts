import { db } from '@/lib/db'
import { bloodBankSchema, bloodInventorySchema } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { BloodBankProfile, BloodInventory, BulkInventoryUpdate } from '@/lib/validations/blood-bank'

export interface BloodBankWithInventory {
    id: string
    name: string
    address: {
        street: string
        city: string
        state: string
        zipCode: string
        country: string
    }
    phone: string
    email: string
    operatingHours?: Record<string, { open: string; close: string; closed: boolean }>
    capacity: number
    isActive: boolean
    coordinates?: { lat: number; lng: number }
    createdAt: Date | null
    updatedAt: Date | null
    inventory: Array<{
        id: string
        bloodType: string
        unitsAvailable: number
        unitsReserved: number
        minimumThreshold: number
        expirationDate: string | null
        lastUpdated: Date | null
    }>
}

export interface InventoryAlert {
    id: string
    bloodBankId: string
    bloodType: string
    currentUnits: number
    minimumThreshold: number
    alertType: 'low_stock' | 'critical_stock' | 'expiring_soon'
    message: string
    createdAt: Date
}

export class BloodBankService {
    /**
     * Create a new blood bank profile
     */
    static async createBloodBank(data: BloodBankProfile): Promise<string> {
        try {
            const [bloodBank] = await db.insert(bloodBankSchema).values({
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                operatingHours: data.operatingHours,
                capacity: data.capacity,
                coordinates: data.coordinates,
                isActive: true
            }).returning({ id: bloodBankSchema.id })

            // Initialize inventory for all blood types with zero units
            const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
            const inventoryData = bloodTypes.map(bloodType => ({
                bloodBankId: bloodBank.id,
                bloodType,
                unitsAvailable: 0,
                unitsReserved: 0,
                minimumThreshold: 10 // Default threshold
            }))

            await db.insert(bloodInventorySchema).values(inventoryData)

            return bloodBank.id
        } catch (error) {
            console.error('Error creating blood bank:', error)
            throw new Error('Failed to create blood bank')
        }
    }

    /**
     * Get blood bank profile by ID
     */
    static async getBloodBankById(id: string): Promise<BloodBankWithInventory | null> {
        try {
            const bloodBank = await db.select().from(bloodBankSchema).where(eq(bloodBankSchema.id, id)).limit(1)

            if (!bloodBank.length) {
                return null
            }

            const inventory = await db.select().from(bloodInventorySchema)
                .where(eq(bloodInventorySchema.bloodBankId, id))

            return {
                ...bloodBank[0],
                address: bloodBank[0].address as {
                    street: string
                    city: string
                    state: string
                    zipCode: string
                    country: string
                },
                operatingHours: bloodBank[0].operatingHours as Record<string, { open: string; close: string; closed: boolean }> | undefined,
                coordinates: bloodBank[0].coordinates as { lat: number; lng: number } | undefined,
                isActive: bloodBank[0].isActive ?? true,
                inventory: inventory.map(item => ({
                    id: item.id,
                    bloodType: item.bloodType,
                    unitsAvailable: item.unitsAvailable,
                    unitsReserved: item.unitsReserved,
                    minimumThreshold: item.minimumThreshold,
                    expirationDate: item.expirationDate,
                    lastUpdated: item.lastUpdated
                }))
            }
        } catch (error) {
            console.error('Error fetching blood bank:', error)
            throw new Error('Failed to fetch blood bank')
        }
    }

    /**
     * Update blood bank profile
     */
    static async updateBloodBank(id: string, data: Partial<BloodBankProfile>): Promise<void> {
        try {
            await db.update(bloodBankSchema)
                .set({
                    ...data,
                    updatedAt: new Date()
                })
                .where(eq(bloodBankSchema.id, id))
        } catch (error) {
            console.error('Error updating blood bank:', error)
            throw new Error('Failed to update blood bank')
        }
    }

    /**
     * Get all blood banks with basic info
     */
    static async getAllBloodBanks(): Promise<Array<Omit<BloodBankWithInventory, 'inventory'>>> {
        try {
            const bloodBanks = await db.select().from(bloodBankSchema)
                .where(eq(bloodBankSchema.isActive, true))

            return bloodBanks.map(bank => ({
                ...bank,
                address: bank.address as {
                    street: string
                    city: string
                    state: string
                    zipCode: string
                    country: string
                },
                operatingHours: bank.operatingHours as Record<string, { open: string; close: string; closed: boolean }> | undefined,
                coordinates: bank.coordinates as { lat: number; lng: number } | undefined,
                isActive: bank.isActive ?? true
            }))
        } catch (error) {
            console.error('Error fetching blood banks:', error)
            throw new Error('Failed to fetch blood banks')
        }
    }

    /**
     * Update inventory for a specific blood type
     */
    static async updateInventory(bloodBankId: string, bloodType: string, data: Partial<BloodInventory>): Promise<void> {
        try {
            await db.update(bloodInventorySchema)
                .set({
                    ...data,
                    lastUpdated: new Date()
                })
                .where(and(
                    eq(bloodInventorySchema.bloodBankId, bloodBankId),
                    eq(bloodInventorySchema.bloodType, bloodType)
                ))
        } catch (error) {
            console.error('Error updating inventory:', error)
            throw new Error('Failed to update inventory')
        }
    }

    /**
     * Bulk update inventory
     */
    static async bulkUpdateInventory(bloodBankId: string, updates: BulkInventoryUpdate['updates']): Promise<void> {
        try {
            for (const update of updates) {
                await this.updateInventory(bloodBankId, update.bloodType, {
                    unitsAvailable: update.unitsAvailable,
                    unitsReserved: update.unitsReserved,
                    minimumThreshold: update.minimumThreshold,
                    expirationDate: update.expirationDate
                })
            }
        } catch (error) {
            console.error('Error bulk updating inventory:', error)
            throw new Error('Failed to bulk update inventory')
        }
    }

    /**
     * Get inventory alerts for low stock and expiring units
     */
    static async getInventoryAlerts(bloodBankId: string): Promise<InventoryAlert[]> {
        try {
            const inventory = await db.select().from(bloodInventorySchema)
                .where(eq(bloodInventorySchema.bloodBankId, bloodBankId))

            const alerts: InventoryAlert[] = []
            const now = new Date()
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

            for (const item of inventory) {
                // Check for low stock
                if (item.unitsAvailable <= item.minimumThreshold && item.unitsAvailable > 0) {
                    alerts.push({
                        id: `${item.id}-low-stock`,
                        bloodBankId,
                        bloodType: item.bloodType,
                        currentUnits: item.unitsAvailable,
                        minimumThreshold: item.minimumThreshold,
                        alertType: 'low_stock',
                        message: `${item.bloodType} blood type is running low (${item.unitsAvailable} units remaining)`,
                        createdAt: now
                    })
                }

                // Check for critical stock (zero units)
                if (item.unitsAvailable === 0) {
                    alerts.push({
                        id: `${item.id}-critical-stock`,
                        bloodBankId,
                        bloodType: item.bloodType,
                        currentUnits: item.unitsAvailable,
                        minimumThreshold: item.minimumThreshold,
                        alertType: 'critical_stock',
                        message: `${item.bloodType} blood type is out of stock`,
                        createdAt: now
                    })
                }

                // Check for expiring units
                if (item.expirationDate) {
                    const expirationDate = new Date(item.expirationDate)
                    if (expirationDate <= sevenDaysFromNow && expirationDate > now) {
                        alerts.push({
                            id: `${item.id}-expiring`,
                            bloodBankId,
                            bloodType: item.bloodType,
                            currentUnits: item.unitsAvailable,
                            minimumThreshold: item.minimumThreshold,
                            alertType: 'expiring_soon',
                            message: `${item.bloodType} blood units expire on ${expirationDate.toLocaleDateString()}`,
                            createdAt: now
                        })
                    }
                }
            }

            return alerts
        } catch (error) {
            console.error('Error getting inventory alerts:', error)
            throw new Error('Failed to get inventory alerts')
        }
    }

    /**
     * Get inventory summary with totals
     */
    static async getInventorySummary(bloodBankId: string) {
        try {
            const inventory = await db.select().from(bloodInventorySchema)
                .where(eq(bloodInventorySchema.bloodBankId, bloodBankId))

            const summary = {
                totalUnits: 0,
                totalReserved: 0,
                totalAvailable: 0,
                lowStockCount: 0,
                criticalStockCount: 0,
                byBloodType: {} as Record<string, {
                    available: number
                    reserved: number
                    threshold: number
                    status: 'normal' | 'low' | 'critical'
                }>
            }

            for (const item of inventory) {
                summary.totalUnits += item.unitsAvailable + item.unitsReserved
                summary.totalReserved += item.unitsReserved
                summary.totalAvailable += item.unitsAvailable

                let status: 'normal' | 'low' | 'critical' = 'normal'
                if (item.unitsAvailable === 0) {
                    status = 'critical'
                    summary.criticalStockCount++
                } else if (item.unitsAvailable <= item.minimumThreshold) {
                    status = 'low'
                    summary.lowStockCount++
                }

                summary.byBloodType[item.bloodType] = {
                    available: item.unitsAvailable,
                    reserved: item.unitsReserved,
                    threshold: item.minimumThreshold,
                    status
                }
            }

            return summary
        } catch (error) {
            console.error('Error getting inventory summary:', error)
            throw new Error('Failed to get inventory summary')
        }
    }

    /**
     * Reserve blood units for a request
     */
    static async reserveBloodUnits(bloodBankId: string, bloodType: string, units: number): Promise<boolean> {
        try {
            const [inventory] = await db.select().from(bloodInventorySchema)
                .where(and(
                    eq(bloodInventorySchema.bloodBankId, bloodBankId),
                    eq(bloodInventorySchema.bloodType, bloodType)
                ))
                .limit(1)

            if (!inventory || inventory.unitsAvailable < units) {
                return false
            }

            await db.update(bloodInventorySchema)
                .set({
                    unitsAvailable: inventory.unitsAvailable - units,
                    unitsReserved: inventory.unitsReserved + units,
                    lastUpdated: new Date()
                })
                .where(and(
                    eq(bloodInventorySchema.bloodBankId, bloodBankId),
                    eq(bloodInventorySchema.bloodType, bloodType)
                ))

            return true
        } catch (error) {
            console.error('Error reserving blood units:', error)
            throw new Error('Failed to reserve blood units')
        }
    }

    /**
     * Release reserved blood units
     */
    static async releaseReservedUnits(bloodBankId: string, bloodType: string, units: number): Promise<void> {
        try {
            const [inventory] = await db.select().from(bloodInventorySchema)
                .where(and(
                    eq(bloodInventorySchema.bloodBankId, bloodBankId),
                    eq(bloodInventorySchema.bloodType, bloodType)
                ))
                .limit(1)

            if (!inventory) {
                throw new Error('Inventory not found')
            }

            const unitsToRelease = Math.min(units, inventory.unitsReserved)

            await db.update(bloodInventorySchema)
                .set({
                    unitsAvailable: inventory.unitsAvailable + unitsToRelease,
                    unitsReserved: inventory.unitsReserved - unitsToRelease,
                    lastUpdated: new Date()
                })
                .where(and(
                    eq(bloodInventorySchema.bloodBankId, bloodBankId),
                    eq(bloodInventorySchema.bloodType, bloodType)
                ))
        } catch (error) {
            console.error('Error releasing reserved units:', error)
            throw new Error('Failed to release reserved units')
        }
    }
}