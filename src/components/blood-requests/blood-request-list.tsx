'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Calendar, Clock, Droplet, Building2, Search, Filter, Eye, Edit, X } from 'lucide-react'
import type { BloodRequest } from '@/lib/services/blood-request'

interface BloodRequestListProps {
    requests: BloodRequest[]
    total: number
    page: number
    limit: number
    totalPages: number
    onPageChange: (page: number) => void
    onFilterChange: (filters: BloodRequestFilters) => void
    onViewRequest: (id: string) => void
    onEditRequest?: (id: string) => void
    onCancelRequest?: (id: string) => void
    isLoading?: boolean
    canEdit?: boolean
    canCancel?: boolean
}

export interface BloodRequestFilters {
    bloodType?: string
    urgencyLevel?: string
    status?: string
    search?: string
    dateFrom?: string
    dateTo?: string
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const urgencyLevels = ['routine', 'urgent', 'emergency']
const statuses = ['pending', 'fulfilled', 'cancelled']

const urgencyColors = {
    routine: 'bg-blue-100 text-blue-800',
    urgent: 'bg-yellow-100 text-yellow-800',
    emergency: 'bg-red-100 text-red-800'
}

const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    fulfilled: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
}

export function BloodRequestList({
    requests,
    total,
    page,
    limit,
    totalPages,
    onPageChange,
    onFilterChange,
    onViewRequest,
    onEditRequest,
    onCancelRequest,
    isLoading = false,
    canEdit = false,
    canCancel = false
}: BloodRequestListProps) {
    const [filters, setFilters] = useState<BloodRequestFilters>({})
    const [showFilters, setShowFilters] = useState(false)

    const handleFilterChange = (key: keyof BloodRequestFilters, value: string) => {
        const newFilters = { ...filters, [key]: value || undefined }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const clearFilters = () => {
        setFilters({})
        onFilterChange({})
    }

    const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '')

    const getUrgencyIcon = (urgency: string) => {
        switch (urgency) {
            case 'emergency':
                return <AlertCircle className="h-4 w-4 text-red-600" />
            case 'urgent':
                return <Clock className="h-4 w-4 text-yellow-600" />
            default:
                return <Calendar className="h-4 w-4 text-blue-600" />
        }
    }

    const formatDateTime = (date: Date) => {
        return format(new Date(date), 'MMM dd, yyyy HH:mm')
    }

    const isOverdue = (requiredBy: Date, status: string) => {
        return status === 'pending' && new Date(requiredBy) < new Date()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Blood Requests</h2>
                    <p className="text-gray-600">
                        {total} total request{total !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-1">
                            {Object.values(filters).filter(v => v).length}
                        </Badge>
                    )}
                </Button>
            </div>

            {/* Filters */}
            {showFilters && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Filter Requests</CardTitle>
                        <CardDescription>
                            Use the filters below to narrow down the blood requests
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="search"
                                        placeholder="Search by facility name..."
                                        value={filters.search || ''}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bloodType">Blood Type</Label>
                                <Select
                                    value={filters.bloodType || ''}
                                    onValueChange={(value) => handleFilterChange('bloodType', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All blood types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All blood types</SelectItem>
                                        {bloodTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="urgencyLevel">Urgency</Label>
                                <Select
                                    value={filters.urgencyLevel || ''}
                                    onValueChange={(value) => handleFilterChange('urgencyLevel', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All urgency levels" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All urgency levels</SelectItem>
                                        {urgencyLevels.map((level) => (
                                            <SelectItem key={level} value={level}>
                                                {level.charAt(0).toUpperCase() + level.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={filters.status || ''}
                                    onValueChange={(value) => handleFilterChange('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All statuses</SelectItem>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateFrom">From Date</Label>
                                <Input
                                    id="dateFrom"
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dateTo">To Date</Label>
                                <Input
                                    id="dateTo"
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                />
                            </div>
                        </div>

                        {hasActiveFilters && (
                            <div className="mt-4 pt-4 border-t">
                                <Button variant="outline" onClick={clearFilters} size="sm">
                                    Clear All Filters
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Requests Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request Details</TableHead>
                                    <TableHead>Facility</TableHead>
                                    <TableHead>Blood Type</TableHead>
                                    <TableHead>Units</TableHead>
                                    <TableHead>Urgency</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Required By</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            Loading requests...
                                        </TableCell>
                                    </TableRow>
                                ) : requests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            No blood requests found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    requests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <p className="font-medium text-sm">
                                                        Request #{request.id.slice(-8)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatDateTime(request.requestDate)}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {request.facility?.name || 'Unknown Facility'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {request.facility?.facilityType}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Droplet className="h-4 w-4 text-red-500" />
                                                    <span className="font-medium">{request.bloodType}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{request.unitsRequested}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getUrgencyIcon(request.urgencyLevel)}
                                                    <Badge className={urgencyColors[request.urgencyLevel as keyof typeof urgencyColors]}>
                                                        {request.urgencyLevel}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                                                    {request.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className={`text-sm ${isOverdue(request.requiredBy, request.status) ? 'text-red-600 font-medium' : ''}`}>
                                                    {formatDateTime(request.requiredBy)}
                                                    {isOverdue(request.requiredBy, request.status) && (
                                                        <p className="text-xs text-red-500">Overdue</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onViewRequest(request.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {canEdit && request.status === 'pending' && onEditRequest && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onEditRequest(request.id)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {canCancel && request.status === 'pending' && onCancelRequest && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onCancelRequest(request.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} requests
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}