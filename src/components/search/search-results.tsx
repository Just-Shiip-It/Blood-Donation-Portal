'use client'

import React, { useState, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, Grid, List, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface SearchResult {
    id: string
    type: 'appointment' | 'blood-bank' | 'request' | 'donation'
    title: string
    subtitle?: string
    description?: string
    status?: string
    date?: Date
    location?: string
    bloodType?: string
    urgency?: 'routine' | 'urgent' | 'emergency'
    distance?: number
    metadata?: Record<string, unknown>
}

export interface SortOption {
    key: string
    label: string
    direction: 'asc' | 'desc'
}

export interface PaginationInfo {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

interface SearchResultsProps {
    results: SearchResult[]
    isLoading?: boolean
    error?: string
    pagination: PaginationInfo
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
    onSort: (sortBy: string, direction: 'asc' | 'desc') => void
    onExport?: () => void
    className?: string
    showViewToggle?: boolean
    showExport?: boolean
    emptyMessage?: string
    emptyDescription?: string
}

const sortOptions: SortOption[] = [
    { key: 'relevance', label: 'Relevance', direction: 'desc' },
    { key: 'date', label: 'Date', direction: 'desc' },
    { key: 'title', label: 'Name', direction: 'asc' },
    { key: 'status', label: 'Status', direction: 'asc' },
    { key: 'distance', label: 'Distance', direction: 'asc' },
    { key: 'urgency', label: 'Urgency', direction: 'desc' },
]

const pageSizeOptions = [10, 20, 50, 100]

const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
        case 'scheduled':
        case 'pending':
            return 'bg-blue-100 text-blue-800'
        case 'completed':
        case 'fulfilled':
            return 'bg-green-100 text-green-800'
        case 'cancelled':
            return 'bg-red-100 text-red-800'
        case 'urgent':
            return 'bg-orange-100 text-orange-800'
        case 'emergency':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const getUrgencyColor = (urgency: string): string => {
    switch (urgency?.toLowerCase()) {
        case 'routine':
            return 'bg-gray-100 text-gray-800'
        case 'urgent':
            return 'bg-orange-100 text-orange-800'
        case 'emergency':
            return 'bg-red-100 text-red-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

const getTypeIcon = (type: string): string => {
    switch (type) {
        case 'appointment':
            return '📅'
        case 'blood-bank':
            return '🏥'
        case 'request':
            return '🩸'
        case 'donation':
            return '❤️'
        default:
            return '📄'
    }
}

function ResultCard({ result }: { result: SearchResult }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getTypeIcon(result.type)}</span>
                            <h3 className="font-medium text-lg truncate">{result.title}</h3>
                            {result.status && (
                                <Badge className={cn("text-xs", getStatusColor(result.status))}>
                                    {result.status}
                                </Badge>
                            )}
                            {result.urgency && (
                                <Badge className={cn("text-xs", getUrgencyColor(result.urgency))}>
                                    {result.urgency}
                                </Badge>
                            )}
                        </div>

                        {result.subtitle && (
                            <p className="text-sm text-muted-foreground mb-2">{result.subtitle}</p>
                        )}

                        {result.description && (
                            <p className="text-sm mb-3 line-clamp-2">{result.description}</p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {result.date && (
                                <span>📅 {result.date.toLocaleDateString()}</span>
                            )}
                            {result.location && (
                                <span>📍 {result.location}</span>
                            )}
                            {result.bloodType && (
                                <span>🩸 {result.bloodType}</span>
                            )}
                            {result.distance && (
                                <span>📏 {result.distance.toFixed(1)} miles</span>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function SearchResults({
    results,
    isLoading = false,
    error,
    pagination,
    onPageChange,
    onPageSizeChange,
    onSort,
    onExport,
    className,
    showViewToggle = true,
    showExport = true,
    emptyMessage = "No results found",
    emptyDescription = "Try adjusting your search criteria or filters",
}: SearchResultsProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [currentSort, setCurrentSort] = useState<SortOption>(sortOptions[0])

    const handleSort = useCallback((sortKey: string) => {
        const newSort = sortOptions.find(opt => opt.key === sortKey) || sortOptions[0]
        setCurrentSort(newSort)
        onSort(newSort.key, newSort.direction)
    }, [onSort])

    const renderPagination = useCallback(() => {
        const { page, pageSize, total, totalPages } = pagination
        const startItem = (page - 1) * pageSize + 1
        const endItem = Math.min(page * pageSize, total)

        return (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        Showing {startItem}-{endItem} of {total} results
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => onPageSizeChange(parseInt(value))}
                    >
                        <SelectTrigger className="w-auto">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size} per page
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                    >
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                                pageNum = i + 1
                            } else if (page <= 3) {
                                pageNum = i + 1
                            } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                            } else {
                                pageNum = page - 2 + i
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={page === pageNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onPageChange(pageNum)}
                                    className="w-8 h-8 p-0"
                                >
                                    {pageNum}
                                </Button>
                            )
                        })}
                    </div>

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
        )
    }, [pagination, onPageChange, onPageSizeChange])

    if (error) {
        return (
            <Card className={cn("w-full", className)}>
                <CardContent className="text-center py-8">
                    <div className="text-destructive mb-2">⚠️ Error</div>
                    <p className="text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Results Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">
                        Search Results
                        {!isLoading && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({pagination.total} found)
                            </span>
                        )}
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sort Dropdown */}
                    <Select
                        value={currentSort.key}
                        onValueChange={handleSort}
                    >
                        <SelectTrigger className="w-40">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {sortOptions.map((option) => (
                                <SelectItem key={option.key} value={option.key}>
                                    <div className="flex items-center gap-2">
                                        {option.direction === 'asc' ? (
                                            <ArrowUp className="h-4 w-4" />
                                        ) : (
                                            <ArrowDown className="h-4 w-4" />
                                        )}
                                        {option.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View Toggle */}
                    {showViewToggle && (
                        <div className="flex border rounded-md">
                            <Button
                                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="rounded-r-none"
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="rounded-l-none"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Export Button */}
                    {showExport && onExport && (
                        <Button variant="outline" size="sm" onClick={onExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Searching...</p>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && results.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="text-4xl mb-4">🔍</div>
                        <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
                        <p className="text-muted-foreground">{emptyDescription}</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {!isLoading && results.length > 0 && (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.map((result) => (
                                <ResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {results.map((result) => (
                                <ResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <Card>
                        <CardContent className="py-4">
                            {renderPagination()}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}