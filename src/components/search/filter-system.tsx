'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Filter, X, ChevronDown, Calendar, Clock, Heart, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface FilterConfig {
    key: string
    label: string
    type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number'
    options?: Array<{ value: string; label: string }>
    placeholder?: string
    icon?: React.ComponentType<{ className?: string }>
}

export interface FilterValue {
    [key: string]: unknown
}

export interface ActiveFilter {
    key: string
    label: string
    value: unknown
    displayValue: string
}

interface FilterSystemProps {
    filters: FilterConfig[]
    values: FilterValue
    onChange: (values: FilterValue) => void
    onClear: () => void
    className?: string
    showActiveFilters?: boolean
    showFilterCount?: boolean
    compactMode?: boolean
}

// Predefined filter configurations for different data types
export const appointmentFilters: FilterConfig[] = [
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        icon: Clock,
        options: [
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'no_show', label: 'No Show' },
        ],
    },
    {
        key: 'bloodType',
        label: 'Blood Type',
        type: 'select',
        icon: Heart,
        options: [
            { value: 'A+', label: 'A+' },
            { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' },
            { value: 'B-', label: 'B-' },
            { value: 'AB+', label: 'AB+' },
            { value: 'AB-', label: 'AB-' },
            { value: 'O+', label: 'O+' },
            { value: 'O-', label: 'O-' },
        ],
    },
    {
        key: 'dateRange',
        label: 'Date Range',
        type: 'daterange',
        icon: Calendar,
    },
    {
        key: 'location',
        label: 'Location',
        type: 'text',
        icon: MapPin,
        placeholder: 'Enter city or zip code',
    },
]

export const bloodRequestFilters: FilterConfig[] = [
    {
        key: 'status',
        label: 'Status',
        type: 'select',
        icon: Clock,
        options: [
            { value: 'pending', label: 'Pending' },
            { value: 'fulfilled', label: 'Fulfilled' },
            { value: 'cancelled', label: 'Cancelled' },
        ],
    },
    {
        key: 'urgencyLevel',
        label: 'Urgency',
        type: 'select',
        icon: Clock,
        options: [
            { value: 'routine', label: 'Routine' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'emergency', label: 'Emergency' },
        ],
    },
    {
        key: 'bloodType',
        label: 'Blood Type',
        type: 'multiselect',
        icon: Heart,
        options: [
            { value: 'A+', label: 'A+' },
            { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' },
            { value: 'B-', label: 'B-' },
            { value: 'AB+', label: 'AB+' },
            { value: 'AB-', label: 'AB-' },
            { value: 'O+', label: 'O+' },
            { value: 'O-', label: 'O-' },
        ],
    },
    {
        key: 'dateRange',
        label: 'Request Date',
        type: 'daterange',
        icon: Calendar,
    },
]

export const donationFilters: FilterConfig[] = [
    {
        key: 'bloodType',
        label: 'Blood Type',
        type: 'select',
        icon: Heart,
        options: [
            { value: 'A+', label: 'A+' },
            { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' },
            { value: 'B-', label: 'B-' },
            { value: 'AB+', label: 'AB+' },
            { value: 'AB-', label: 'AB-' },
            { value: 'O+', label: 'O+' },
            { value: 'O-', label: 'O-' },
        ],
    },
    {
        key: 'dateRange',
        label: 'Donation Date',
        type: 'daterange',
        icon: Calendar,
    },
    {
        key: 'location',
        label: 'Blood Bank',
        type: 'text',
        icon: MapPin,
        placeholder: 'Search blood bank',
    },
]

export function FilterSystem({
    filters,
    values,
    onChange,
    onClear,
    className,
    showActiveFilters = true,
    showFilterCount = true,
    compactMode = false,
}: FilterSystemProps) {
    const [isExpanded, setIsExpanded] = useState(!compactMode)

    // Calculate active filters
    const activeFilters = useMemo((): ActiveFilter[] => {
        return filters.reduce((acc, filter) => {
            const value = values[filter.key]
            if (value !== undefined && value !== null && value !== '' &&
                !(Array.isArray(value) && value.length === 0)) {

                let displayValue: string

                if (filter.type === 'select' && filter.options) {
                    const option = filter.options.find(opt => opt.value === value)
                    displayValue = option?.label || String(value)
                } else if (filter.type === 'multiselect' && Array.isArray(value) && filter.options) {
                    const selectedOptions = filter.options.filter(opt => value.includes(opt.value))
                    displayValue = selectedOptions.map(opt => opt.label).join(', ')
                } else if (filter.type === 'daterange' && typeof value === 'object' && value && 'from' in value) {
                    const dateRange = value as { from?: string; to?: string }
                    displayValue = dateRange.to
                        ? `${dateRange.from} - ${dateRange.to}`
                        : `From ${dateRange.from}`
                } else {
                    displayValue = String(value)
                }

                acc.push({
                    key: filter.key,
                    label: filter.label,
                    value,
                    displayValue,
                })
            }
            return acc
        }, [] as ActiveFilter[])
    }, [filters, values])

    const handleFilterChange = useCallback((key: string, value: unknown) => {
        onChange({
            ...values,
            [key]: value,
        })
    }, [values, onChange])

    const handleRemoveFilter = useCallback((key: string) => {
        const newValues = { ...values }
        delete newValues[key]
        onChange(newValues)
    }, [values, onChange])

    const renderFilterInput = useCallback((filter: FilterConfig) => {
        const value = values[filter.key]
        const Icon = filter.icon

        switch (filter.type) {
            case 'select':
                return (
                    <Select
                        value={typeof value === 'string' ? value || 'all' : 'all'}
                        onValueChange={(newValue) => handleFilterChange(filter.key, newValue === 'all' ? undefined : newValue)}
                    >
                        <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                                {Icon && <Icon className="h-4 w-4" />}
                                <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                            {filter.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case 'multiselect':
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon className="h-4 w-4" />}
                                    <span>
                                        {Array.isArray(value) && value.length > 0
                                            ? `${value.length} selected`
                                            : `Select ${filter.label.toLowerCase()}`}
                                    </span>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuLabel>{filter.label}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {filter.options?.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={Array.isArray(value) && value.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        const currentValue = Array.isArray(value) ? value : []
                                        const newValue = checked
                                            ? [...currentValue, option.value]
                                            : currentValue.filter(v => v !== option.value)
                                        handleFilterChange(filter.key, newValue)
                                    }}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )

            case 'text':
                return (
                    <div className="relative">
                        {Icon && <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                        <Input
                            value={typeof value === 'string' ? value : ''}
                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
                            className={Icon ? 'pl-10' : ''}
                        />
                    </div>
                )

            case 'daterange':
                return (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={(value as { from?: string; to?: string })?.from || ''}
                                onChange={(e) => handleFilterChange(filter.key, {
                                    ...(typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}),
                                    from: e.target.value,
                                })}
                                placeholder="From date"
                            />
                            <Input
                                type="date"
                                value={(value as { from?: string; to?: string })?.to || ''}
                                onChange={(e) => handleFilterChange(filter.key, {
                                    ...(typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}),
                                    to: e.target.value,
                                })}
                                placeholder="To date"
                            />
                        </div>
                    </div>
                )

            default:
                return null
        }
    }, [values, handleFilterChange])

    return (
        <div className={cn("space-y-4", className)}>
            {/* Filter Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <span className="font-medium">Filters</span>
                    {showFilterCount && activeFilters.length > 0 && (
                        <Badge variant="secondary">
                            {activeFilters.length}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeFilters.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClear}>
                            <X className="h-4 w-4 mr-2" />
                            Clear All
                        </Button>
                    )}
                    {compactMode && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <ChevronDown className={cn("h-4 w-4 transition-transform", {
                                "rotate-180": isExpanded
                            })} />
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters */}
            {showActiveFilters && activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {activeFilters.map((filter) => (
                        <Badge
                            key={filter.key}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                        >
                            <span className="text-xs">
                                {filter.label}: {filter.displayValue}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => handleRemoveFilter(filter.key)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Filter Controls */}
            {isExpanded && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filters.map((filter) => (
                                <div key={filter.key} className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        {filter.label}
                                    </Label>
                                    {renderFilterInput(filter)}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}