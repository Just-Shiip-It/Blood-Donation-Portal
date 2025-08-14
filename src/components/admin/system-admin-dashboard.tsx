'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
    Users,
    Activity,
    TrendingUp,
    AlertTriangle,
    Calendar,
    Droplets,
    Building2
} from 'lucide-react'

interface DashboardMetrics {
    totalUsers: number
    totalDonors: number
    totalBloodBanks: number
    totalFacilities: number
    totalAppointments: number
    totalDonations: number
    totalBloodRequests: number
    activeUsers: number
    recentGrowth: {
        users: number
        donors: number
        appointments: number
        donations: number
    }
}

interface SystemAnalytics {
    userGrowth: Array<{
        date: string
        users: number
        donors: number
    }>
    appointmentTrends: Array<{
        date: string
        scheduled: number
        completed: number
        cancelled: number
    }>
    bloodRequestTrends: Array<{
        date: string
        requests: number
        fulfilled: number
        urgent: number
    }>
    inventoryStatus: Array<{
        bloodType: string
        totalAvailable: number
        totalReserved: number
        averageThreshold: number
    }>
}

export function SystemAdminDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            const [metricsResponse, analyticsResponse] = await Promise.all([
                fetch('/api/admin/analytics?type=dashboard'),
                fetch('/api/admin/analytics?type=system&days=30')
            ])

            if (!metricsResponse.ok || !analyticsResponse.ok) {
                throw new Error('Failed to fetch dashboard data')
            }

            const metricsData = await metricsResponse.json()
            const analyticsData = await analyticsResponse.json()

            setMetrics(metricsData.data)
            setAnalytics(analyticsData.data)
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
                    <Button onClick={fetchDashboardData}>Try Again</Button>
                </div>
            </div>
        )
    }

    if (!metrics || !analytics) {
        return null
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num)
    }

    const getGrowthColor = (growth: number) => {
        if (growth > 0) return 'text-green-600'
        if (growth < 0) return 'text-red-600'
        return 'text-gray-600'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Administration</h1>
                    <p className="text-gray-600">Monitor and manage the blood donation portal</p>
                </div>
                <Button onClick={fetchDashboardData} variant="outline">
                    Refresh Data
                </Button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</div>
                        <p className={`text-xs ${getGrowthColor(metrics.recentGrowth.users)}`}>
                            +{metrics.recentGrowth.users} this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(metrics.totalDonors)}</div>
                        <p className={`text-xs ${getGrowthColor(metrics.recentGrowth.donors)}`}>
                            +{metrics.recentGrowth.donors} this month
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blood Banks</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(metrics.totalBloodBanks)}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatNumber(metrics.totalFacilities)} healthcare facilities
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(metrics.totalDonations)}</div>
                        <p className={`text-xs ${getGrowthColor(metrics.recentGrowth.donations)}`}>
                            +{metrics.recentGrowth.donations} this month
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Activity</CardTitle>
                                <CardDescription>Recent system usage metrics</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Active Users (30 days)</span>
                                    <Badge variant="secondary">{formatNumber(metrics.activeUsers)}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Total Appointments</span>
                                    <Badge variant="secondary">{formatNumber(metrics.totalAppointments)}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Blood Requests</span>
                                    <Badge variant="secondary">{formatNumber(metrics.totalBloodRequests)}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Growth Metrics</CardTitle>
                                <CardDescription>30-day growth statistics</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">New Users</span>
                                    <span className={`text-sm font-semibold ${getGrowthColor(metrics.recentGrowth.users)}`}>
                                        +{metrics.recentGrowth.users}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">New Donors</span>
                                    <span className={`text-sm font-semibold ${getGrowthColor(metrics.recentGrowth.donors)}`}>
                                        +{metrics.recentGrowth.donors}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">New Appointments</span>
                                    <span className={`text-sm font-semibold ${getGrowthColor(metrics.recentGrowth.appointments)}`}>
                                        +{metrics.recentGrowth.appointments}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">New Donations</span>
                                    <span className={`text-sm font-semibold ${getGrowthColor(metrics.recentGrowth.donations)}`}>
                                        +{metrics.recentGrowth.donations}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Blood Inventory Status</CardTitle>
                            <CardDescription>Current inventory levels across all blood banks</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {analytics.inventoryStatus.map((item) => (
                                    <div key={item.bloodType} className="p-4 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-lg">{item.bloodType}</span>
                                            <Droplets className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span>Available:</span>
                                                <span className="font-medium">{item.totalAvailable}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Reserved:</span>
                                                <span className="font-medium">{item.totalReserved}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Threshold:</span>
                                                <span className="font-medium">{Math.round(item.averageThreshold)}</span>
                                            </div>
                                        </div>
                                        {item.totalAvailable <= item.averageThreshold && (
                                            <Badge variant="destructive" className="mt-2 w-full justify-center">
                                                Low Stock
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>User Growth Trend</CardTitle>
                                <CardDescription>Daily user and donor registrations (last 30 days)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-gray-500">
                                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                                    <p>Chart visualization would be implemented here</p>
                                    <p className="text-sm">Total new users: {analytics.userGrowth.reduce((sum, day) => sum + day.users, 0)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Appointment Trends</CardTitle>
                                <CardDescription>Daily appointment statistics (last 30 days)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="h-12 w-12 mx-auto mb-4" />
                                    <p>Chart visualization would be implemented here</p>
                                    <p className="text-sm">
                                        Total appointments: {analytics.appointmentTrends.reduce((sum, day) =>
                                            sum + day.scheduled + day.completed + day.cancelled, 0
                                        )}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}