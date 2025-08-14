'use client'

import React, { useState, useCallback } from 'react'
import { Save, Search, Trash2, Edit, Star, Clock } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { SearchCriteria } from './advanced-search'

export interface SavedSearch {
    id: string
    name: string
    description?: string
    criteria: SearchCriteria
    createdAt: Date
    updatedAt: Date
    isFavorite: boolean
    useCount: number
    lastUsed?: Date
}

interface SavedSearchesProps {
    searches: SavedSearch[]
    onSave: (name: string, description: string, criteria: SearchCriteria) => void
    onLoad: (search: SavedSearch) => void
    onUpdate: (id: string, updates: Partial<SavedSearch>) => void
    onDelete: (id: string) => void
    currentCriteria?: SearchCriteria
    className?: string
}

interface SaveSearchDialogProps {
    isOpen: boolean
    onClose: () => void
    onSave: (name: string, description: string) => void
    initialName?: string
    initialDescription?: string
}

function SaveSearchDialog({
    isOpen,
    onClose,
    onSave,
    initialName = '',
    initialDescription = '',
}: SaveSearchDialogProps) {
    const [name, setName] = useState(initialName)
    const [description, setDescription] = useState(initialDescription)

    const handleSave = useCallback(() => {
        if (name.trim()) {
            onSave(name.trim(), description.trim())
            setName('')
            setDescription('')
            onClose()
        }
    }, [name, description, onSave, onClose])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save Search</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="search-name">Search Name</Label>
                        <Input
                            id="search-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter a name for this search"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="search-description">Description (optional)</Label>
                        <Input
                            id="search-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this search"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!name.trim()}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Search
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function SavedSearches({
    searches,
    onSave,
    onLoad,
    onUpdate,
    onDelete,
    currentCriteria,
    className,
}: SavedSearchesProps) {
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null)

    const handleSaveSearch = useCallback((name: string, description: string) => {
        if (currentCriteria) {
            onSave(name, description, currentCriteria)
        }
    }, [currentCriteria, onSave])

    const handleLoadSearch = useCallback((search: SavedSearch) => {
        // Update usage statistics
        onUpdate(search.id, {
            useCount: search.useCount + 1,
            lastUsed: new Date(),
        })
        onLoad(search)
    }, [onLoad, onUpdate])

    const handleToggleFavorite = useCallback((search: SavedSearch) => {
        onUpdate(search.id, {
            isFavorite: !search.isFavorite,
        })
    }, [onUpdate])

    const handleEditSearch = useCallback((search: SavedSearch) => {
        setEditingSearch(search)
        setShowSaveDialog(true)
    }, [])

    const handleUpdateSearch = useCallback((name: string, description: string) => {
        if (editingSearch) {
            onUpdate(editingSearch.id, {
                name,
                description,
                updatedAt: new Date(),
            })
            setEditingSearch(null)
        }
    }, [editingSearch, onUpdate])

    const formatCriteria = useCallback((criteria: SearchCriteria): string => {
        const parts: string[] = []

        if (criteria.query) parts.push(`"${criteria.query}"`)
        if (criteria.bloodType) parts.push(`Blood: ${criteria.bloodType}`)
        if (criteria.status) parts.push(`Status: ${criteria.status}`)
        if (criteria.location) parts.push(`Location: ${criteria.location}`)
        if (criteria.category) parts.push(`Category: ${criteria.category}`)

        return parts.join(' • ') || 'No filters'
    }, [])

    // Sort searches: favorites first, then by last used, then by creation date
    const sortedSearches = [...searches].sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1

        if (a.lastUsed && b.lastUsed) {
            return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
        }
        if (a.lastUsed && !b.lastUsed) return -1
        if (!a.lastUsed && b.lastUsed) return 1

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const favoriteSearches = sortedSearches.filter(s => s.isFavorite)
    const recentSearches = sortedSearches.filter(s => !s.isFavorite).slice(0, 5)

    return (
        <div className={cn("space-y-4", className)}>
            {/* Save Current Search */}
            {currentCriteria && Object.keys(currentCriteria).length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Save className="h-5 w-5" />
                                Save Current Search
                            </span>
                            <Button
                                size="sm"
                                onClick={() => setShowSaveDialog(true)}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">
                            {formatCriteria(currentCriteria)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Favorite Searches */}
            {favoriteSearches.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Favorite Searches
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {favoriteSearches.map((search) => (
                            <div
                                key={search.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 h-auto font-medium text-left justify-start"
                                            onClick={() => handleLoadSearch(search)}
                                        >
                                            {search.name}
                                        </Button>
                                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                    </div>
                                    {search.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {search.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>Used {search.useCount} times</span>
                                        {search.lastUsed && (
                                            <span>Last used {format(search.lastUsed, 'MMM d, yyyy')}</span>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            •••
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleLoadSearch(search)}>
                                            <Search className="h-4 w-4 mr-2" />
                                            Load Search
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEditSearch(search)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFavorite(search)}>
                                            <Star className="h-4 w-4 mr-2" />
                                            Remove from Favorites
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(search.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Recent Searches
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recentSearches.map((search) => (
                            <div
                                key={search.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="p-0 h-auto font-medium text-left justify-start"
                                            onClick={() => handleLoadSearch(search)}
                                        >
                                            {search.name}
                                        </Button>
                                    </div>
                                    {search.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {search.description}
                                        </p>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {formatCriteria(search.criteria)}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        <span>Used {search.useCount} times</span>
                                        <span>Created {format(search.createdAt, 'MMM d, yyyy')}</span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            •••
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleLoadSearch(search)}>
                                            <Search className="h-4 w-4 mr-2" />
                                            Load Search
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEditSearch(search)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleFavorite(search)}>
                                            <Star className="h-4 w-4 mr-2" />
                                            Add to Favorites
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => onDelete(search.id)}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {searches.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Saved Searches</h3>
                        <p className="text-muted-foreground mb-4">
                            Save your frequently used searches for quick access later.
                        </p>
                        {currentCriteria && Object.keys(currentCriteria).length > 0 && (
                            <Button onClick={() => setShowSaveDialog(true)}>
                                <Save className="h-4 w-4 mr-2" />
                                Save Current Search
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Save Search Dialog */}
            <SaveSearchDialog
                isOpen={showSaveDialog}
                onClose={() => {
                    setShowSaveDialog(false)
                    setEditingSearch(null)
                }}
                onSave={editingSearch ? handleUpdateSearch : handleSaveSearch}
                initialName={editingSearch?.name}
                initialDescription={editingSearch?.description}
            />
        </div>
    )
}