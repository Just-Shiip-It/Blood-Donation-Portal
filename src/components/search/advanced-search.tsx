'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Filter, X, MapPin, Calendar, Clock, Heart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Search criteria schema
const searchCriteriaSchema = z.object({
    query: z.string().optional(),
    bloodType: z.string().optional(),
    location: z.string().optional(),
    radius: z.number().min(1).max(100).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.string().optional(),
    urgencyLevel: z.string().optional(),
    category: z.enum(['appointments', 'blood-banks', 'requests', 'donations']).optional(),
})

export type SearchCriteria = z.infer<typeof searchCriteriaSchema>

interface AdvancedSearchProps {
    onSearch: (criteria: SearchCriteria) => void
    onClear: () => void
    initialCriteria?: Partial<SearchCriteria>
    className?: string
    showLocationSearch?: boolean
    showDateRange?: boolean
    showBloodType?: boolean
    showStatus?: boolean
    showUrgency?: boolean
    showCategory?: boolean
    savedSearches?: SavedSearch[]
    onSaveSearch?: (name: string, criteria: SearchCriteria) => void
    onLoadSearch?: (criteria: SearchCriteria) => void
}

interface SavedSearch {
    id: string
    name: string
    criteria: SearchCriteria
    createdAt: Date
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const statusOptions = ['scheduled', 'completed', 'cancelled', 'pending', 'fulfilled']
const urgencyLevels = ['routine', 'urgent', 'emergency']
const categories = [
    { value: 'appointments', label: 'Appointments', icon: Calendar },
    { value: 'blood-banks', label: 'Blood Banks', icon: Heart },
    { value: 'requests', label: 'Blood Requests', icon: Clock },
    { value: 'donations', label: 'Donations', icon: Heart },
]

export function AdvancedSearch({
    onSearch,
    onClear,
    initialCriteria = {},
    className,
    showLocationSearch = true,
    showDateRange = true,
    showBloodType = true,
    showStatus = true,
    showUrgency = false,
    showCategory = true,
    savedSearches = [],
    onSaveSearch,
    onLoadSearch,
}: AdvancedSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const form = useForm<SearchCriteria>({
        resolver: zodResolver(searchCriteriaSchema),
        defaultValues: initialCriteria,
    })

    const { register, handleSubmit, watch, setValue, reset } = form
    const watchedValues = watch()

    // Calculate active filters from watched values
    const activeFilters = useMemo(() => {
        return Object.keys(watchedValues).filter(key => {
            const value = watchedValues[key as keyof SearchCriteria]
            return key !== 'query' && value !== undefined && value !== '' && value !== null
        })
    }, [watchedValues])

    const handleSearch = useCallback((data: SearchCriteria) => {
        // Filter out empty values
        const cleanedData: Partial<SearchCriteria> = {}

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== null) {
                (cleanedData as Record<string, unknown>)[key] = value
            }
        })

        onSearch(cleanedData as SearchCriteria)
    }, [onSearch])

    const handleClear = useCallback(() => {
        reset()
        onClear()
    }, [reset, onClear])

    const handleSaveSearch = useCallback(() => {
        if (!onSaveSearch) return

        const searchName = prompt('Enter a name for this search:')
        if (searchName) {
            onSaveSearch(searchName, watchedValues)
        }
    }, [onSaveSearch, watchedValues])

    const handleLoadSearch = useCallback((search: SavedSearch) => {
        Object.entries(search.criteria).forEach(([key, value]) => {
            setValue(key as keyof SearchCriteria, value)
        })
        if (onLoadSearch) {
            onLoadSearch(search.criteria)
        }
    }, [setValue, onLoadSearch])

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Advanced Search
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {activeFilters.length > 0 && (
                            <Badge variant="secondary">
                                {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <Filter className="h-4 w-4" />
                            {isExpanded ? 'Simple' : 'Advanced'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(handleSearch)} className="space-y-4">
                    {/* Basic Search */}
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                {...register('query')}
                                placeholder="Search for appointments, blood banks, or requests..."
                                className="w-full"
                            />
                        </div>
                        <Button type="submit">
                            <Search className="h-4 w-4 mr-2" />
                            Search
                        </Button>
                    </div>

                    {/* Advanced Filters */}
                    {isExpanded && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Category Filter */}
                                {showCategory && (
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <Select
                                            value={watchedValues.category || 'all'}
                                            onValueChange={(value) => setValue('category', value === 'all' ? undefined : value as SearchCriteria['category'])}
                                        >
                                            <SelectTrigger aria-label="Category">
                                                <SelectValue placeholder="All categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All categories</SelectItem>
                                                {categories.map((category) => {
                                                    const Icon = category.icon
                                                    return (
                                                        <SelectItem key={category.value} value={category.value}>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4" />
                                                                {category.label}
                                                            </div>
                                                        </SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Blood Type Filter */}
                                {showBloodType && (
                                    <div className="space-y-2">
                                        <Label htmlFor="bloodType">Blood Type</Label>
                                        <Select
                                            value={watchedValues.bloodType || 'any'}
                                            onValueChange={(value) => setValue('bloodType', value === 'any' ? '' : value)}
                                        >
                                            <SelectTrigger aria-label="Blood Type">
                                                <SelectValue placeholder="Any blood type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any">Any blood type</SelectItem>
                                                {bloodTypes.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Status Filter */}
                                {showStatus && (
                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={watchedValues.status || 'any'}
                                            onValueChange={(value) => setValue('status', value === 'any' ? '' : value)}
                                        >
                                            <SelectTrigger aria-label="Status">
                                                <SelectValue placeholder="Any status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any">Any status</SelectItem>
                                                {statusOptions.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Urgency Level Filter */}
                                {showUrgency && (
                                    <div className="space-y-2">
                                        <Label htmlFor="urgencyLevel">Urgency</Label>
                                        <Select
                                            value={watchedValues.urgencyLevel || 'any'}
                                            onValueChange={(value) => setValue('urgencyLevel', value === 'any' ? '' : value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Any urgency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="any">Any urgency</SelectItem>
                                                {urgencyLevels.map((level) => (
                                                    <SelectItem key={level} value={level}>
                                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* Location Search */}
                            {showLocationSearch && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Location
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            {...register('location')}
                                            placeholder="Enter city, state, or zip code"
                                            className="flex-1"
                                        />
                                        <Select
                                            value={watchedValues.radius?.toString() || '25'}
                                            onValueChange={(value) => setValue('radius', parseInt(value))}
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 miles</SelectItem>
                                                <SelectItem value="10">10 miles</SelectItem>
                                                <SelectItem value="25">25 miles</SelectItem>
                                                <SelectItem value="50">50 miles</SelectItem>
                                                <SelectItem value="100">100 miles</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Date Range */}
                            {showDateRange && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Date Range
                                    </Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Input
                                                {...register('dateFrom')}
                                                type="date"
                                                placeholder="From date"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                {...register('dateTo')}
                                                type="date"
                                                placeholder="To date"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-4">
                                <div className="flex gap-2">
                                    <Button type="submit" size="sm">
                                        Apply Filters
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                                        <X className="h-4 w-4 mr-2" />
                                        Clear All
                                    </Button>
                                </div>
                                {onSaveSearch && (
                                    <Button type="button" variant="ghost" size="sm" onClick={handleSaveSearch}>
                                        Save Search
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </form>

                {/* Saved Searches */}
                {savedSearches.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Saved Searches</Label>
                            <div className="flex flex-wrap gap-2">
                                {savedSearches.map((search) => (
                                    <Button
                                        key={search.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleLoadSearch(search)}
                                        className="text-xs"
                                    >
                                        {search.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Active Filters Display */}
                {activeFilters.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Active Filters</Label>
                            <div className="flex flex-wrap gap-2">
                                {activeFilters.map((filter) => (
                                    <Badge key={filter} variant="secondary" className="text-xs">
                                        {filter}: {String(watchedValues[filter as keyof SearchCriteria])}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}