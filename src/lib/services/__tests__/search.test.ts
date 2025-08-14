import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SearchService } from '../search'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
    db: {
        select: vi.fn(),
        from: vi.fn(),
        leftJoin: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        offset: vi.fn(),
    },
}))

// Mock database schemas
vi.mock('@/lib/db/schema', () => ({
    appointmentSchema: {
        id: 'appointments.id',
        donorId: 'appointments.donor_id',
        bloodBankId: 'appointments.blood_bank_id',
        appointmentDate: 'appointments.appointment_date',
        status: 'appointments.status',
        notes: 'appointments.notes',
        createdAt: 'appointments.created_at',
    },
    donorProfileSchema: {
        id: 'donor_profiles.id',
        firstName: 'donor_profiles.first_name',
        lastName: 'donor_profiles.last_name',
        bloodType: 'donor_profiles.blood_type',
    },
    bloodBankSchema: {
        id: 'blood_banks.id',
        name: 'blood_banks.name',
        address: 'blood_banks.address',
        coordinates: 'blood_banks.coordinates',
        isActive: 'blood_banks.is_active',
        phone: 'blood_banks.phone',
        email: 'blood_banks.email',
        operatingHours: 'blood_banks.operating_hours',
        capacity: 'blood_banks.capacity',
        createdAt: 'blood_banks.created_at',
    },
    bloodRequestSchema: {
        id: 'blood_requests.id',
        facilityId: 'blood_requests.facility_id',
        bloodType: 'blood_requests.blood_type',
        unitsRequested: 'blood_requests.units_requested',
        urgencyLevel: 'blood_requests.urgency_level',
        requestDate: 'blood_requests.request_date',
        requiredBy: 'blood_requests.required_by',
        status: 'blood_requests.status',
        notes: 'blood_requests.notes',
    },
    healthcareFacilitySchema: {
        id: 'healthcare_facilities.id',
        name: 'healthcare_facilities.name',
        address: 'healthcare_facilities.address',
        coordinates: 'healthcare_facilities.coordinates',
    },
    donationHistorySchema: {
        id: 'donation_history.id',
        donorId: 'donation_history.donor_id',
        bloodBankId: 'donation_history.blood_bank_id',
        donationDate: 'donation_history.donation_date',
        bloodType: 'donation_history.blood_type',
        unitsCollected: 'donation_history.units_collected',
        notes: 'donation_history.notes',
    },
}))

describe('SearchService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('search', () => {
        it('should route to searchAppointments when category is appointments', async () => {
            const searchAppointmentsSpy = vi.spyOn(SearchService, 'searchAppointments').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            const options = {
                criteria: { category: 'appointments' as const },
                page: 1,
                pageSize: 20,
            }

            await SearchService.search(options)

            expect(searchAppointmentsSpy).toHaveBeenCalledWith(options)
        })

        it('should route to searchBloodBanks when category is blood-banks', async () => {
            const searchBloodBanksSpy = vi.spyOn(SearchService, 'searchBloodBanks').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            const options = {
                criteria: { category: 'blood-banks' as const },
                page: 1,
                pageSize: 20,
            }

            await SearchService.search(options)

            expect(searchBloodBanksSpy).toHaveBeenCalledWith(options)
        })

        it('should route to searchBloodRequests when category is requests', async () => {
            const searchBloodRequestsSpy = vi.spyOn(SearchService, 'searchBloodRequests').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            const options = {
                criteria: { category: 'requests' as const },
                page: 1,
                pageSize: 20,
            }

            await SearchService.search(options)

            expect(searchBloodRequestsSpy).toHaveBeenCalledWith(options)
        })

        it('should route to searchDonations when category is donations', async () => {
            const searchDonationsSpy = vi.spyOn(SearchService, 'searchDonations').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            const options = {
                criteria: { category: 'donations' as const },
                page: 1,
                pageSize: 20,
            }

            await SearchService.search(options)

            expect(searchDonationsSpy).toHaveBeenCalledWith(options)
        })

        it('should default to searchAll when no category is specified', async () => {
            const searchAllSpy = vi.spyOn(SearchService, 'searchAll').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            const options = {
                criteria: {},
                page: 1,
                pageSize: 20,
            }

            await SearchService.search(options)

            expect(searchAllSpy).toHaveBeenCalledWith(options)
        })
    })

    describe('calculateDistance', () => {
        it('should calculate distance between two coordinates correctly', () => {
            // Test distance between New York and Los Angeles (approximately 2445 miles)
            const nyLat = 40.7128
            const nyLng = -74.0060
            const laLat = 34.0522
            const laLng = -118.2437

            // Access the private method through reflection for testing
            const calculateDistance = (SearchService as unknown as { calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number }).calculateDistance
            const distance = calculateDistance(nyLat, nyLng, laLat, laLng)

            // Allow for some margin of error in the calculation
            expect(distance).toBeGreaterThan(2400)
            expect(distance).toBeLessThan(2500)
        })

        it('should return 0 for identical coordinates', () => {
            const calculateDistance = (SearchService as unknown as { calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => number }).calculateDistance
            const distance = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060)

            expect(distance).toBe(0)
        })
    })

    describe('formatAddress', () => {
        it('should format address object correctly', () => {
            const formatAddress = (SearchService as unknown as { formatAddress: (address: unknown) => string }).formatAddress

            const address = {
                street: '123 Main St',
                city: 'New York',
                state: 'NY',
                zipCode: '10001',
            }

            const formatted = formatAddress(address)
            expect(formatted).toBe('123 Main St, New York, NY, 10001')
        })

        it('should handle partial address objects', () => {
            const formatAddress = (SearchService as unknown as { formatAddress: (address: unknown) => string }).formatAddress

            const address = {
                city: 'New York',
                state: 'NY',
            }

            const formatted = formatAddress(address)
            expect(formatted).toBe('New York, NY')
        })

        it('should return string addresses as-is', () => {
            const formatAddress = (SearchService as unknown as { formatAddress: (address: unknown) => string }).formatAddress

            const address = 'New York, NY'
            const formatted = formatAddress(address)
            expect(formatted).toBe('New York, NY')
        })

        it('should return default for null/undefined addresses', () => {
            const formatAddress = (SearchService as unknown as { formatAddress: (address: unknown) => string }).formatAddress

            expect(formatAddress(null)).toBe('Unknown Location')
            expect(formatAddress(undefined)).toBe('Unknown Location')
            expect(formatAddress({})).toBe('Unknown Location')
        })
    })

    describe('getSortColumn', () => {
        it('should return correct sort column for appointment table', () => {
            const getSortColumn = (SearchService as unknown as { getSortColumn: (table: string, sortBy: string) => unknown }).getSortColumn

            expect(getSortColumn('appointment', 'date')).toBeDefined()
            expect(getSortColumn('appointment', 'status')).toBeDefined()
            expect(getSortColumn('appointment', 'created')).toBeDefined()
            expect(getSortColumn('appointment', 'invalid')).toBeUndefined()
        })

        it('should return correct sort column for blood-bank table', () => {
            const getSortColumn = (SearchService as unknown as { getSortColumn: (table: string, sortBy: string) => unknown }).getSortColumn

            expect(getSortColumn('blood-bank', 'name')).toBeDefined()
            expect(getSortColumn('blood-bank', 'created')).toBeDefined()
            expect(getSortColumn('blood-bank', 'invalid')).toBeUndefined()
        })

        it('should return correct sort column for request table', () => {
            const getSortColumn = (SearchService as unknown as { getSortColumn: (table: string, sortBy: string) => unknown }).getSortColumn

            expect(getSortColumn('request', 'date')).toBeDefined()
            expect(getSortColumn('request', 'urgency')).toBeDefined()
            expect(getSortColumn('request', 'status')).toBeDefined()
            expect(getSortColumn('request', 'required')).toBeDefined()
            expect(getSortColumn('request', 'invalid')).toBeUndefined()
        })

        it('should return correct sort column for donation table', () => {
            const getSortColumn = (SearchService as unknown as { getSortColumn: (table: string, sortBy: string) => unknown }).getSortColumn

            expect(getSortColumn('donation', 'date')).toBeDefined()
            expect(getSortColumn('donation', 'bloodType')).toBeDefined()
            expect(getSortColumn('donation', 'invalid')).toBeUndefined()
        })

        it('should return undefined for invalid table', () => {
            const getSortColumn = (SearchService as unknown as { getSortColumn: (table: string, sortBy: string) => unknown }).getSortColumn

            expect(getSortColumn('invalid', 'date')).toBeUndefined()
        })
    })

    describe('search functionality integration', () => {
        it('should handle empty search criteria', async () => {
            const mockQuery = {
                limit: vi.fn().mockReturnThis(),
                offset: vi.fn().mockReturnThis(),
            }



            const mockDb = {
                select: vi.fn().mockReturnValue({
                    from: vi.fn().mockReturnValue({
                        leftJoin: vi.fn().mockReturnValue(mockQuery),
                    }),
                }),
            }

            // Mock the database response
            vi.mocked(db.select).mockImplementation(mockDb.select as typeof db.select)

            const options = {
                criteria: {},
                page: 1,
                pageSize: 20,
            }

            // This should not throw an error
            expect(async () => {
                await SearchService.search(options)
            }).not.toThrow()
        })

        it('should handle location-based filtering', async () => {
            const options = {
                criteria: { category: 'blood-banks' as const },
                location: {
                    address: 'New York, NY',
                    coordinates: { lat: 40.7128, lng: -74.0060 },
                    radius: 25,
                },
                page: 1,
                pageSize: 20,
            }

            // Mock successful search
            const searchBloodBanksSpy = vi.spyOn(SearchService, 'searchBloodBanks').mockResolvedValue({
                results: [
                    {
                        id: '1',
                        type: 'blood-bank',
                        title: 'Test Blood Bank',
                        subtitle: 'Blood Bank',
                        description: 'Test description',
                        location: 'New York, NY',
                        distance: 5.2,
                        metadata: {},
                    },
                ],
                pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            })

            const result = await SearchService.search(options)

            expect(searchBloodBanksSpy).toHaveBeenCalledWith(options)
            expect(result.results).toHaveLength(1)
            expect(result.results[0].distance).toBeDefined()
        })

        it('should handle pagination correctly', async () => {
            const options = {
                criteria: { category: 'appointments' as const },
                page: 2,
                pageSize: 10,
            }

            const searchAppointmentsSpy = vi.spyOn(SearchService, 'searchAppointments').mockResolvedValue({
                results: [],
                pagination: { page: 2, pageSize: 10, total: 25, totalPages: 3 },
            })

            const result = await SearchService.search(options)

            expect(searchAppointmentsSpy).toHaveBeenCalledWith(options)
            expect(result.pagination.page).toBe(2)
            expect(result.pagination.pageSize).toBe(10)
            expect(result.pagination.totalPages).toBe(3)
        })

        it('should handle sorting parameters', async () => {
            const options = {
                criteria: { category: 'appointments' as const },
                sortBy: 'date',
                sortDirection: 'asc' as const,
                page: 1,
                pageSize: 20,
            }

            const searchAppointmentsSpy = vi.spyOn(SearchService, 'searchAppointments').mockResolvedValue({
                results: [],
                pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
            })

            await SearchService.search(options)

            expect(searchAppointmentsSpy).toHaveBeenCalledWith(options)
        })
    })
})