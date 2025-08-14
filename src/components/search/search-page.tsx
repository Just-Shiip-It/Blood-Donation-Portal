'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { AdvancedSearch, SearchCriteria } from './advanced-search'
import { LocationSearch, LocationData } from './location-search'
import { FilterSystem, appointmentFilters, bloodRequestFilters, donationFilters, FilterValue } from './filter-system'
import { SavedSearches, SavedSearch } from './saved-searches'
import { SearchResults, SearchResult, PaginationInfo } from './search-results'

interface SearchPageProps {
    initialCategory?: 'appointments' | 'blood-banks' | 'requests' | 'donations'
    onSearch?: (criteria: SearchCriteria, location?: LocationData, filters?: FilterValue) => Promise<{
        results: SearchResult[]
        pagination: PaginationInfo
    }>
    savedSearches?: SavedSearch[]
    onSaveSearch?: (name: string, description: string, criteria: SearchCriteria) => void
    onUpdateSearch?: (id: string, updates: Partial<SavedSearch>) => void
    onDeleteSearch?: (id: string) => void
}

export function SearchPage({
    initialCategory = 'appointments',
    onSearch,
    savedSearches = [],
    onSaveSearch,
    onUpdateSearch,
    onDeleteSearch,
}: SearchPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // State management
    const [activeTab, setActiveTab] = useState(initialCategory)
    const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({})
    const [locationData, setLocationData] = useState<LocationData | undefined>()
    const [filterValues, setFilterValues] = useState<FilterValue>({})
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Handle search execution
    const handleSearch = useCallback(async (
        criteria: SearchCriteria,
        location?: LocationData,
        filters?: FilterValue,
        page: number = 1,
        pageSize: number = pagination.pageSize
    ) => {
        if (!onSearch) {
            // Mock search results for demo
            setIsLoading(true)
            setError(null)

            setTimeout(() => {
                const mockResults: SearchResult[] = [
                    {
                        id: '1',
                        type: 'appointment',
                        title: 'Blood Donation Appointment',
                        subtitle: 'City Blood Bank',
                        description: 'Scheduled appointment for blood donation',
                        status: 'scheduled',
                        date: new Date('2024-02-15'),
                        location: 'New York, NY',
                        bloodType: 'O+',
                        distance: 2.5,
                    },
                    {
                        id: '2',
                        type: 'blood-bank',
                        title: 'Metropolitan Blood Center',
                        subtitle: 'Full-service blood bank',
                        description: 'Comprehensive blood banking services with modern facilities',
                        status: 'active',
                        location: 'New York, NY',
                        distance: 1.2,
                    },
                    {
                        id: '3',
                        type: 'request',
                        title: 'Urgent Blood Request',
                        subtitle: 'General Hospital',
                        description: 'Emergency request for O- blood type',
                        status: 'pending',
                        urgency: 'emergency',
                        bloodType: 'O-',
                        date: new Date('2024-02-10'),
                        location: 'New York, NY',
                    },
                ]

                const filteredResults = mockResults.filter(result => {
                    if (criteria.category && result.type !== criteria.category.slice(0, -1)) return false
                    if (criteria.bloodType && result.bloodType !== criteria.bloodType) return false
                    if (criteria.status && result.status !== criteria.status) return false
                    if (criteria.query) {
                        const searchText = `${result.title} ${result.subtitle} ${result.description}`.toLowerCase()
                        return searchText.includes(criteria.query.toLowerCase())
                    }
                    return true
                })

                setSearchResults(filteredResults)
                setPagination({
                    page,
                    pageSize,
                    total: filteredResults.length,
                    totalPages: Math.ceil(filteredResults.length / pageSize),
                })
                setIsLoading(false)
            }, 1000)

            return
        }

        try {
            setIsLoading(true)
            setError(null)

            const result = await onSearch(criteria, location, filters)
            setSearchResults(result.results)
            setPagination(result.pagination)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed')
            setSearchResults([])
        } finally {
            setIsLoading(false)
        }
    }, [onSearch, pagination.pageSize])

    // Initialize from URL parameters
    useEffect(() => {
        const category = searchParams.get('category') as typeof activeTab
        const query = searchParams.get('q')
        const bloodType = searchParams.get('bloodType')
        const status = searchParams.get('status')
        const location = searchParams.get('location')

        if (category && ['appointments', 'blood-banks', 'requests', 'donations'].includes(category)) {
            setActiveTab(category)
        }

        const initialCriteria: SearchCriteria = {}
        if (query) initialCriteria.query = query
        if (bloodType) initialCriteria.bloodType = bloodType
        if (status) initialCriteria.status = status
        if (location) initialCriteria.location = location

        if (Object.keys(initialCriteria).length > 0) {
            setSearchCriteria(initialCriteria)
            handleSearch(initialCriteria)
        }
    }, [searchParams, handleSearch])

    // Update URL when search criteria changes
    const updateURL = useCallback((criteria: SearchCriteria, category: string) => {
        const params = new URLSearchParams()
        params.set('category', category)

        if (criteria.query) params.set('q', criteria.query)
        if (criteria.bloodType) params.set('bloodType', criteria.bloodType)
        if (criteria.status) params.set('status', criteria.status)
        if (criteria.location) params.set('location', criteria.location)

        router.push(`/search?${params.toString()}`, { scroll: false })
    }, [router])



    // Handle advanced search
    const handleAdvancedSearch = useCallback((criteria: SearchCriteria) => {
        setSearchCriteria(criteria)
        updateURL(criteria, activeTab)
        handleSearch(criteria, locationData, filterValues)
    }, [activeTab, locationData, filterValues, updateURL, handleSearch])

    // Handle location change
    const handleLocationChange = useCallback((location: LocationData) => {
        setLocationData(location)
        if (Object.keys(searchCriteria).length > 0) {
            handleSearch(searchCriteria, location, filterValues)
        }
    }, [searchCriteria, filterValues, handleSearch])

    // Handle filter change
    const handleFilterChange = useCallback((filters: FilterValue) => {
        setFilterValues(filters)
        if (Object.keys(searchCriteria).length > 0) {
            handleSearch(searchCriteria, locationData, filters)
        }
    }, [searchCriteria, locationData, handleSearch])

    // Handle clear all
    const handleClearAll = useCallback(() => {
        setSearchCriteria({})
        setLocationData(undefined)
        setFilterValues({})
        setSearchResults([])
        setPagination(prev => ({ ...prev, total: 0, totalPages: 0 }))
        router.push('/search', { scroll: false })
    }, [router])

    // Handle saved search operations
    const handleLoadSearch = useCallback((search: SavedSearch) => {
        setSearchCriteria(search.criteria)
        if (search.criteria.category) {
            setActiveTab(search.criteria.category)
        }
        updateURL(search.criteria, search.criteria.category || activeTab)
        handleSearch(search.criteria, locationData, filterValues)
    }, [activeTab, locationData, filterValues, updateURL, handleSearch])

    // Handle pagination
    const handlePageChange = useCallback((page: number) => {
        handleSearch(searchCriteria, locationData, filterValues, page)
    }, [searchCriteria, locationData, filterValues, handleSearch])

    const handlePageSizeChange = useCallback((pageSize: number) => {
        handleSearch(searchCriteria, locationData, filterValues, 1, pageSize)
    }, [searchCriteria, locationData, filterValues, handleSearch])

    // Handle sorting
    const handleSort = useCallback((sortBy: string, direction: 'asc' | 'desc') => {
        // In a real implementation, this would trigger a new search with sort parameters
        console.log('Sort by:', sortBy, direction)
    }, [])

    // Handle export
    const handleExport = useCallback(() => {
        // In a real implementation, this would export the current results
        console.log('Exporting results:', searchResults)
    }, [searchResults])

    // Get current filter configuration based on active tab
    const getCurrentFilters = useCallback(() => {
        switch (activeTab) {
            case 'appointments':
                return appointmentFilters
            case 'requests':
                return bloodRequestFilters
            case 'donations':
                return donationFilters
            default:
                return appointmentFilters
        }
    }, [activeTab])

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Search Sidebar */}
                <div className="lg:w-1/3 space-y-6">
                    {/* Advanced Search */}
                    <AdvancedSearch
                        onSearch={handleAdvancedSearch}
                        onClear={handleClearAll}
                        initialCriteria={searchCriteria}
                        showCategory={true}
                        showLocationSearch={false} // We have a separate location component
                        savedSearches={savedSearches}
                        onSaveSearch={onSaveSearch ? (name: string, criteria: SearchCriteria) => onSaveSearch(name, '', criteria) : undefined}
                        onLoadSearch={(criteria: SearchCriteria) => {
                            setSearchCriteria(criteria)
                            if (criteria.category) {
                                setActiveTab(criteria.category)
                            }
                            updateURL(criteria, criteria.category || activeTab)
                            handleSearch(criteria, locationData, filterValues)
                        }}
                    />

                    {/* Location Search */}
                    <LocationSearch
                        onLocationChange={handleLocationChange}
                        initialLocation={locationData}
                    />

                    {/* Category-specific Filters */}
                    <FilterSystem
                        filters={getCurrentFilters()}
                        values={filterValues}
                        onChange={handleFilterChange}
                        onClear={() => setFilterValues({})}
                        showActiveFilters={true}
                        compactMode={true}
                    />

                    {/* Saved Searches */}
                    <SavedSearches
                        searches={savedSearches}
                        onSave={onSaveSearch || (() => { })}
                        onLoad={handleLoadSearch}
                        onUpdate={onUpdateSearch || (() => { })}
                        onDelete={onDeleteSearch || (() => { })}
                        currentCriteria={searchCriteria}
                    />
                </div>

                {/* Main Content */}
                <div className="lg:w-2/3">
                    <Tabs value={activeTab} onValueChange={(value) => {
                        setActiveTab(value as typeof activeTab)
                        const newCriteria = { ...searchCriteria, category: value as 'appointments' | 'blood-banks' | 'requests' | 'donations' }
                        setSearchCriteria(newCriteria)
                        updateURL(newCriteria, value)
                        if (Object.keys(searchCriteria).length > 0) {
                            handleSearch(newCriteria, locationData, filterValues)
                        }
                    }}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="appointments">Appointments</TabsTrigger>
                            <TabsTrigger value="blood-banks">Blood Banks</TabsTrigger>
                            <TabsTrigger value="requests">Requests</TabsTrigger>
                            <TabsTrigger value="donations">Donations</TabsTrigger>
                        </TabsList>

                        <TabsContent value="appointments" className="mt-6">
                            <SearchResults
                                results={searchResults}
                                isLoading={isLoading}
                                error={error || undefined}
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                onSort={handleSort}
                                onExport={handleExport}
                                emptyMessage="No appointments found"
                                emptyDescription="Try adjusting your search criteria or check back later for new appointments"
                            />
                        </TabsContent>

                        <TabsContent value="blood-banks" className="mt-6">
                            <SearchResults
                                results={searchResults}
                                isLoading={isLoading}
                                error={error || undefined}
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                onSort={handleSort}
                                onExport={handleExport}
                                emptyMessage="No blood banks found"
                                emptyDescription="Try expanding your search radius or adjusting location filters"
                            />
                        </TabsContent>

                        <TabsContent value="requests" className="mt-6">
                            <SearchResults
                                results={searchResults}
                                isLoading={isLoading}
                                error={error || undefined}
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                onSort={handleSort}
                                onExport={handleExport}
                                emptyMessage="No blood requests found"
                                emptyDescription="Try adjusting urgency level or blood type filters"
                            />
                        </TabsContent>

                        <TabsContent value="donations" className="mt-6">
                            <SearchResults
                                results={searchResults}
                                isLoading={isLoading}
                                error={error || undefined}
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                                onSort={handleSort}
                                onExport={handleExport}
                                emptyMessage="No donations found"
                                emptyDescription="Try adjusting date range or location filters"
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}