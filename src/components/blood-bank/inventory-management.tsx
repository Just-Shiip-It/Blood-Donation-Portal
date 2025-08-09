'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface InventoryItem {
    id: string
    bloodType: string
    unitsAvailable: number
    unitsReserved: number
    minimumThreshold: number
    expirationDate: string | null
    lastUpdated: Date | null
}

interface InventorySummary {
    totalUnits: number
    totalReserved: number
    totalAvailable: number
    lowStockCount: number
    criticalStockCount: number
    byBloodType: Record<string, {
        available: number
        reserved: number
        threshold: number
        status: 'normal' | 'low' | 'critical'
    }>
}

interface InventoryAlert {
    id: string
    bloodBankId: string
    bloodType: string
    currentUnits: number
    minimumThreshold: number
    alertType: 'low_stock' | 'critical_stock' | 'expiring_soon'
    message: string
    createdAt: Date
}

interface InventoryManagementProps {
    bloodBankId: string
}

export function InventoryManagement({ bloodBankId }: InventoryManagementProps) {
    const [editingItem, setEditingItem] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<Record<string, Partial<InventoryItem>>>({})
    const queryClient = useQueryClient()

    // Fetch inventory data
    const { data: inventoryData, isLoading } = useQuery({
        queryKey: ['bloodbank-inventory', bloodBankId],
        queryFn: async () => {
            const response = await fetch(`/api/bloodbanks/${bloodBankId}/inventory`)
            if (!response.ok) throw new Error('Failed to fetch inventory')
            const result = await response.json()
            return result.data as { inventory: InventoryItem[], summary: InventorySummary }
        },
        refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
    })

    // Fetch alerts
    const { data: alerts } = useQuery({
        queryKey: ['bloodbank-alerts', bloodBankId],
        queryFn: async () => {
            const response = await fetch(`/api/bloodbanks/${bloodBankId}/alerts`)
            if (!response.ok) throw new Error('Failed to fetch alerts')
            const result = await response.json()
            return result.data as InventoryAlert[]
        },
        refetchInterval: 60000 // Refetch every minute
    })

    // Update inventory mutation
    const updateInventoryMutation = useMutation({
        mutationFn: async (updates: Array<{ bloodType: string; unitsAvailable: number; unitsReserved?: number; minimumThreshold?: number }>) => {
            const response = await fetch(`/api/bloodbanks/${bloodBankId}/inventory`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            })
            if (!response.ok) throw new Error('Failed to update inventory')
            return response.json()
        },
        onSuccess: () => {
            toast.success('Inventory updated successfully')
            queryClient.invalidateQueries({ queryKey: ['bloodbank-inventory', bloodBankId] })
            queryClient.invalidateQueries({ queryKey: ['bloodbank-alerts', bloodBankId] })
            setEditingItem(null)
            setEditValues({})
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to update inventory')
        }
    })

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item.id)
        setEditValues({
            [item.id]: {
                unitsAvailable: item.unitsAvailable,
                unitsReserved: item.unitsReserved,
                minimumThreshold: item.minimumThreshold
            }
        })
    }

    const handleSave = (item: InventoryItem) => {
        const values = editValues[item.id]
        if (!values) return

        updateInventoryMutation.mutate([{
            bloodType: item.bloodType,
            unitsAvailable: values.unitsAvailable ?? item.unitsAvailable,
            unitsReserved: values.unitsReserved ?? item.unitsReserved,
            minimumThreshold: values.minimumThreshold ?? item.minimumThreshold
        }])
    }

    const handleCancel = () => {
        setEditingItem(null)
        setEditValues({})
    }

    const getStatusBadge = (status: 'normal' | 'low' | 'critical') => {
        switch (status) {
            case 'critical':
                return <Badge variant="destructive">Critical</Badge>
            case 'low':
                return <Badge variant="secondary">Low Stock</Badge>
            default:
                return <Badge variant="default">Normal</Badge>
        }
    }

    const getStatusIcon = (available: number, threshold: number) => {
        if (available === 0) return <TrendingDown className="h-4 w-4 text-red-500" />
        if (available <= threshold) return <Minus className="h-4 w-4 text-yellow-500" />
        return <TrendingUp className="h-4 w-4 text-green-500" />
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner className="h-8 w-8" />
            </div>
        )
    }

    const { inventory, summary } = inventoryData || { inventory: [], summary: null }

    return (
        <div className="space-y-6">
            {/* Alerts Section */}
            {alerts && alerts.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                        Inventory Alerts
                    </h3>
                    {alerts.map((alert) => (
                        <Alert key={alert.id} variant={alert.alertType === 'critical_stock' ? 'destructive' : 'default'}>
                            <AlertDescription>{alert.message}</AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalUnits}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Available</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.totalAvailable}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{summary.totalReserved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{summary.lowStockCount + summary.criticalStockCount}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Blood Inventory</CardTitle>
                    <CardDescription>
                        Manage your blood bank inventory levels and thresholds
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {inventory.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-4">
                                    {getStatusIcon(item.unitsAvailable, item.minimumThreshold)}
                                    <div>
                                        <div className="font-semibold text-lg">{item.bloodType}</div>
                                        {summary && getStatusBadge(summary.byBloodType[item.bloodType]?.status || 'normal')}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    {editingItem === item.id ? (
                                        <>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm">Available:</label>
                                                <Input
                                                    type="number"
                                                    value={editValues[item.id]?.unitsAvailable ?? item.unitsAvailable}
                                                    onChange={(e) => setEditValues(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            unitsAvailable: parseInt(e.target.value) || 0
                                                        }
                                                    }))}
                                                    className="w-20"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm">Threshold:</label>
                                                <Input
                                                    type="number"
                                                    value={editValues[item.id]?.minimumThreshold ?? item.minimumThreshold}
                                                    onChange={(e) => setEditValues(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            minimumThreshold: parseInt(e.target.value) || 0
                                                        }
                                                    }))}
                                                    className="w-20"
                                                />
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSave(item)}
                                                disabled={updateInventoryMutation.isPending}
                                            >
                                                Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={handleCancel}>
                                                Cancel
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">Available</div>
                                                <div className="font-semibold">{item.unitsAvailable}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">Reserved</div>
                                                <div className="font-semibold">{item.unitsReserved}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-500">Threshold</div>
                                                <div className="font-semibold">{item.minimumThreshold}</div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                                                Edit
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}