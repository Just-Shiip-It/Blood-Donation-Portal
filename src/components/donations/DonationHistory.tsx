'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { DonationRecord } from '@/lib/services/donation-history'

interface DonationHistoryProps {
    donorId?: string
    bloodBankId?: string
    showFilters?: boolean
    showExport?: boolean
}

interface DonationHistoryQuery {
    donorId?: string
    bloodBankId?: string
    bloodType?: string
    startDate?: string
    endDate?: string
    page: number
    limit: number
    sortBy: string
    sortOrder: 'asc' | 'desc'
}

interface DonationHistoryResponse {
    donations: DonationRecord[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export default function DonationHistory({
    donorId,
    bloodBankId,
    showFilters = true,
    showExport = true
}: DonationHistoryProps) {
    const [query, setQuery] = useState<DonationHistoryQuery>({
        donorId,
        bloodBankId,
        page: 1,
        limit: 10,
        sortBy: 'donationDate',
        sortOrder: 'desc'
    })

    const [filters, setFilters] = useState({
        bloodType: '',
        startDate: '',
        endDate: '',
        search: ''
    })

    const [showFilterPanel, setShowFilterPanel] = useState(false)

    const { data, isLoading, error, refetch } = useQuery<DonationHistoryResponse>({
        queryKey: ['donation-history', query],
        queryFn: async () => {
            const params = new URLSearchParams()

            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, value.toString())
                }
            })

            const response = await fetch(`/api/donations?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch donation history')
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch donation history')
            }

            return result.data
        }
    })

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const applyFilters = () => {
        setQuery(prev => ({
            ...prev,
            bloodType: filters.bloodType || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            page: 1
        }))
        setShowFilterPanel(false)
    }

    const clearFilters = () => {
        setFilters({
            bloodType: '',
            startDate: '',
            endDate: '',
            search: ''
        })
        setQuery(prev => ({
            ...prev,
            bloodType: undefined,
            startDate: undefined,
            endDate: undefined,
            page: 1
        }))
    }

    const handlePageChange = (newPage: number) => {
        setQuery(prev => ({ ...prev, page: newPage }))
    }



    const handleExport = async (format: 'csv' | 'json') => {
        try {
            const params = new URLSearchParams()
            if (donorId) params.append('donorId', donorId)
            if (bloodBankId) params.append('bloodBankId', bloodBankId)
            if (filters.startDate) params.append('startDate', filters.startDate)
            if (filters.endDate) params.append('endDate', filters.endDate)
            params.append('format', format)
            params.append('includeHealthMetrics', 'true')
            params.append('includeNotes', 'true')

            const response = await fetch(`/api/donations/export?${params}`)
            if (!response.ok) {
                throw new Error('Export failed')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `donation-history-${new Date().toISOString().split('T')[0]}.${format}`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Export error:', error)
            // You might want to show a toast notification here
        }
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-red-600">
                        <p>Error loading donation history</p>
                        <Button onClick={() => refetch()} className="mt-2">
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header and Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Donation History</h2>
                    <p className="text-muted-foreground">
                        {data?.pagination.total || 0} donation records found
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {showFilters && (
                        <Button
                            variant="outline"
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                    )}

                    {showExport && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleExport('csv')}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                CSV
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleExport('json')}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                JSON
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Panel */}
            {showFilterPanel && (
                <Card>
                    <CardHeader>
                        <CardTitle>Filter Donations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Blood Type</label>
                                <Select
                                    value={filters.bloodType}
                                    onValueChange={(value) => handleFilterChange('bloodType', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All blood types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All blood types</SelectItem>
                                        <SelectItem value="A+">A+</SelectItem>
                                        <SelectItem value="A-">A-</SelectItem>
                                        <SelectItem value="B+">B+</SelectItem>
                                        <SelectItem value="B-">B-</SelectItem>
                                        <SelectItem value="AB+">AB+</SelectItem>
                                        <SelectItem value="AB-">AB-</SelectItem>
                                        <SelectItem value="O+">O+</SelectItem>
                                        <SelectItem value="O-">O-</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">Start Date</label>
                                <Input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-2 block">End Date</label>
                                <Input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={applyFilters}>Apply Filters</Button>
                            <Button variant="outline" onClick={clearFilters}>Clear</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Donation Records */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Card key={i}>
                                <CardContent className="p-6">
                                    <div className="animate-pulse space-y-3">
                                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : data?.donations.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center">
                            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium mb-2">No donations found</h3>
                            <p className="text-muted-foreground">
                                {Object.values(filters).some(v => v)
                                    ? "Try adjusting your filters to see more results."
                                    : "No donation records available yet."
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    data?.donations.map((donation) => (
                        <DonationCard key={donation.id} donation={donation} />
                    ))
                )}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                        {data.pagination.total} results
                    </p>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(data.pagination.page - 1)}
                            disabled={data.pagination.page === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>

                        <span className="text-sm">
                            Page {data.pagination.page} of {data.pagination.totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(data.pagination.page + 1)}
                            disabled={data.pagination.page === data.pagination.totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function DonationCard({ donation }: { donation: DonationRecord }) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-sm">
                                {donation.bloodType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                {format(new Date(donation.donationDate), 'PPP')}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <p className="font-medium">
                                {donation.unitsCollected} unit{donation.unitsCollected !== 1 ? 's' : ''} collected
                            </p>

                            {donation.bloodBank && (
                                <p className="text-sm text-muted-foreground">
                                    at {donation.bloodBank.name}
                                </p>
                            )}

                            {donation.donor && (
                                <p className="text-sm text-muted-foreground">
                                    Donor: {donation.donor.firstName} {donation.donor.lastName}
                                </p>
                            )}
                        </div>

                        {donation.healthMetrics && (() => {
                            const metrics = donation.healthMetrics as Record<string, unknown>
                            const bloodPressure = metrics.bloodPressure as { systolic?: number; diastolic?: number } | undefined
                            const hemoglobin = metrics.hemoglobin as number | undefined
                            const pulse = metrics.pulse as number | undefined
                            return (
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                    {hemoglobin && (
                                        <span>Hemoglobin: {hemoglobin} g/dL</span>
                                    )}
                                    {bloodPressure && (
                                        <span>
                                            BP: {bloodPressure.systolic}/
                                            {bloodPressure.diastolic}
                                        </span>
                                    )}
                                    {pulse && (
                                        <span>Pulse: {pulse} BPM</span>
                                    )}
                                </div>
                            )
                        })()}

                        {donation.notes && (
                            <p className="text-sm text-muted-foreground italic">
                                &ldquo;{donation.notes}&rdquo;
                            </p>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                            Recorded {format(new Date(donation.createdAt), 'PP')}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}