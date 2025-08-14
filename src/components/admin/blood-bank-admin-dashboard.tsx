'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Progress } from '@/components/ui/progress'
import {
    Droplets,
    Calendar,
    TrendingUp,
    AlertTriangle,
    Users,
    Clock,
    CheckCircle
} from 'lucide-react'

interface BloodBankMetrics {
    bloodBankId: string
    totalInventory: number
    lowStockAlerts: number
    appointmentsToday: number
    appointmentsThisWeek: number
    donationsThisMonth: number
    inventoryByType: Array<{
        bloodType: string
        available: number
        reserved: number
        threshold: number
    }>
}

interface BloodBankAdminDashboardProps {
    bloodBankId: string
}

export function BloodBankAdminDashboard({ bloodBankId }: BloodBankAdminDashboardProps) {
    const [metrics, setMetrics] = useState<BloodBankMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (bloodBankId) {
            fetchBloodBankData()
        }
    }, [bloodBankId])

    const fetchBloodBankData = async () => {
        try {
            setLoading(true)

            const response = await fetch(`/api/admin/analytics?type=bloodbank&bloodBankId=${bloodBankId}`)

            if (!response.ok) {
                throw new Error('Failed to fetch blood bank data')
            }

            const data = await response.json()
            setMetrics(data.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <Button onClick={fetchBloodBankData}>Try Again</Button>
                </div>
            </div>
        )
    }

    if (!metrics) {
        return null
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num)
    }

    const getStockStatus = (available: number, threshold: number) => {
        if (available <= threshold * 0.5) return { status: 'critical', color: 'bg-red-500' }
        if (available <= threshold) return { status: 'low', color: 'bg-yellow-500' }
        return { status: 'good', color: 'bg-green-500' }
    }

    const getStockPercentage = (available: number, threshold: number) => {
        const maxStock = threshold * 3 // Assume max stock is 3x threshold
        return Math.min((available / maxStock) * 100, 100)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Blood Bank Operations</h1>
                    <p className="text-gray-600">Monitor inventory, appointments, and operational metrics</p>
                </div>
                <Button onClick={fetchBloodBankData} variant="outline">
                    Refresh Data
                </Button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(metrics.totalInventory)}</div>
                        <p className="text-xs text-muted-foreground">
                            units available
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics.lowStockAlerts}</div>
                        <p className="text-xs text-muted-foreground">
                            blood types below threshold
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today&apos;s Appointments</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.appointmentsToday}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.appointmentsThisWeek} this week
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Donations</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.donationsThisMonth}</div>
                        <p className="text-xs text-muted-foreground">
                            donations completed
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                    <TabsTrigger value="insights">Operational Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Blood Inventory by Type</CardTitle>
                            <CardDescription>Current stock levels and thresholds</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {metrics.inventoryByType.map((item) => {
                                    const stockStatus = getStockStatus(item.available, item.threshold)
                                    const stockPercentage = getStockPercentage(item.available, item.threshold)

                                    return (
                                        <div key={item.bloodType} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        <Droplets className="h-5 w-5 text-red-500" />
                                                        <span className="font-semibold text-lg">{item.bloodType}</span>
                                                    </div>
                                                    <Badge
                                                        variant={stockStatus.status === 'critical' ? 'destructive' :
                                                            stockStatus.status === 'low' ? 'secondary' : 'default'}
                                                    >
                                                        {stockStatus.status === 'critical' ? 'Critical' :
                                                            stockStatus.status === 'low' ? 'Low Stock' : 'Good'}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-semibold">{item.available}</div>
                                                    <div className="text-sm text-gray-500">available</div>
                                                </div>
                                            </div>

                                            <Progress value={stockPercentage} className="h-2" />

                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Reserved: {item.reserved}</span>
                                                <span>Threshold: {item.threshold}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appointments" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Appointment Overview</CardTitle>
                                <CardDescription>Current appointment statistics</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Clock className="h-5 w-5 text-blue-500" />
                                        <span className="font-medium">Today&apos;s Appointments</span>
                                    </div>
                                    <Badge variant="secondary" className="text-lg px-3 py-1">
                                        {metrics.appointmentsToday}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="h-5 w-5 text-green-500" />
                                        <span className="font-medium">This Week</span>
                                    </div>
                                    <Badge variant="secondary" className="text-lg px-3 py-1">
                                        {metrics.appointmentsThisWeek}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <CheckCircle className="h-5 w-5 text-purple-500" />
                                        <span className="font-medium">Monthly Donations</span>
                                    </div>
                                    <Badge variant="secondary" className="text-lg px-3 py-1">
                                        {metrics.donationsThisMonth}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Common administrative tasks</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button className="w-full justify-start" variant="outline">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    View Today&apos;s Schedule
                                </Button>
                                <Button className="w-full justify-start" variant="outline">
                                    <Droplets className="h-4 w-4 mr-2" />
                                    Update Inventory
                                </Button>
                                <Button className="w-full justify-start" variant="outline">
                                    <Users className="h-4 w-4 mr-2" />
                                    Manage Donors
                                </Button>
                                <Button className="w-full justify-start" variant="outline">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Send Low Stock Alerts
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Operational Efficiency</CardTitle>
                                <CardDescription>Key performance indicators</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Inventory Turnover</span>
                                    <span className="text-sm text-gray-600">Good</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Appointment Utilization</span>
                                    <span className="text-sm text-gray-600">85%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Donor Retention</span>
                                    <span className="text-sm text-gray-600">High</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Stock Availability</span>
                                    <span className="text-sm text-gray-600">
                                        {((metrics.inventoryByType.length - metrics.lowStockAlerts) / metrics.inventoryByType.length * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recommendations</CardTitle>
                                <CardDescription>System-generated insights</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {metrics.lowStockAlerts > 0 && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <AlertTriangle className="h-4 w-4 text-red-500" />
                                            <span className="text-sm font-medium text-red-800">
                                                {metrics.lowStockAlerts} blood type(s) need restocking
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {metrics.appointmentsToday > 10 && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4 text-blue-500" />
                                            <span className="text-sm font-medium text-blue-800">
                                                High appointment volume today - consider additional staff
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <span className="text-sm font-medium text-green-800">
                                            Donation rate is above average this month
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}