'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { InventoryManagement } from './inventory-management'
import { Building2, Users, AlertTriangle } from 'lucide-react'

interface BloodBankDashboardProps {
    bloodBankId: string
}

interface BloodBankData {
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

export function BloodBankDashboard({ bloodBankId }: BloodBankDashboardProps) {
    const { data: bloodBank, isLoading, error } = useQuery({
        queryKey: ['bloodbank', bloodBankId],
        queryFn: async () => {
            const response = await fetch(`/api/bloodbanks/${bloodBankId}`)
            if (!response.ok) throw new Error('Failed to fetch blood bank data')
            const result = await response.json()
            return result.data as BloodBankData
        }
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoadingSpinner className="h-8 w-8" />
            </div>
        )
    }

    if (error || !bloodBank) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Failed to load blood bank data</p>
            </div>
        )
    }

    const totalUnits = bloodBank.inventory.reduce((sum, item) => sum + item.unitsAvailable + item.unitsReserved, 0)
    const lowStockItems = bloodBank.inventory.filter(item => item.unitsAvailable <= item.minimumThreshold)
    const criticalStockItems = bloodBank.inventory.filter(item => item.unitsAvailable === 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{bloodBank.name}</h1>
                    <p className="text-gray-600">Blood Bank Management Dashboard</p>
                </div>
                <Badge variant={bloodBank.isActive ? 'default' : 'secondary'}>
                    {bloodBank.isActive ? 'Active' : 'Inactive'}
                </Badge>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUnits}</div>
                        <p className="text-xs text-muted-foreground">
                            Blood units in stock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Capacity</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bloodBank.capacity}</div>
                        <p className="text-xs text-muted-foreground">
                            Maximum capacity
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Items below threshold
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{criticalStockItems.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Out of stock items
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Blood Bank Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Blood Bank Information</CardTitle>
                    <CardDescription>Basic information about your blood bank</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold mb-2">Contact Information</h4>
                            <p className="text-sm text-gray-600">Email: {bloodBank.email}</p>
                            <p className="text-sm text-gray-600">Phone: {bloodBank.phone}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Address</h4>
                            <p className="text-sm text-gray-600">
                                {bloodBank.address.street}<br />
                                {bloodBank.address.city}, {bloodBank.address.state} {bloodBank.address.zipCode}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Management */}
            <InventoryManagement bloodBankId={bloodBankId} />
        </div>
    )
}