'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import {
    Droplets,
    Calendar,
    TrendingUp,
    Heart,
    Activity,
    Clock
} from 'lucide-react'
import { DonationStats } from '@/lib/services/donation-history'

interface DonationStatsProps {
    donorId?: string
    bloodBankId?: string
}

const BLOOD_TYPE_COLORS = {
    'A+': '#ef4444',
    'A-': '#f97316',
    'B+': '#eab308',
    'B-': '#84cc16',
    'AB+': '#22c55e',
    'AB-': '#06b6d4',
    'O+': '#3b82f6',
    'O-': '#8b5cf6'
}

export default function DonationStatsComponent({ donorId, bloodBankId }: DonationStatsProps) {
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('year')

    const { data: stats, isLoading, error } = useQuery<DonationStats>({
        queryKey: ['donation-stats', { donorId, bloodBankId, period }],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (donorId) params.append('donorId', donorId)
            if (bloodBankId) params.append('bloodBankId', bloodBankId)
            params.append('period', period)

            const response = await fetch(`/api/donations/stats?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch donation statistics')
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch donation statistics')
            }

            return result.data
        }
    })

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-red-600">
                        <p>Error loading donation statistics</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!stats) {
        return null
    }

    // Prepare data for charts
    const bloodTypeData = Object.entries(stats.donationsByBloodType).map(([type, count]) => ({
        bloodType: type,
        count,
        color: BLOOD_TYPE_COLORS[type as keyof typeof BLOOD_TYPE_COLORS] || '#6b7280'
    }))

    const monthlyData = stats.donationsByMonth.map(item => ({
        month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        donations: item.count,
        units: item.units
    }))

    const eligibilityDays = stats.daysSinceLastDonation || 0
    const eligibilityProgress = Math.min((eligibilityDays / 56) * 100, 100)

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Donation Statistics</h2>
                    <p className="text-muted-foreground">
                        Overview of donation activity and health metrics
                    </p>
                </div>

                <Select value={period} onValueChange={(value) => setPeriod(value as 'week' | 'month' | 'quarter' | 'year' | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
                                <p className="text-2xl font-bold">{stats.totalDonations}</p>
                            </div>
                            <Droplets className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Units Collected</p>
                                <p className="text-2xl font-bold">{stats.totalUnitsCollected}</p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Average per Donation</p>
                                <p className="text-2xl font-bold">{stats.averageUnitsPerDonation}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                {stats.daysSinceLastDonation !== undefined && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Days Since Last</p>
                                    <p className="text-2xl font-bold">{stats.daysSinceLastDonation}</p>
                                </div>
                                <Clock className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Eligibility Status */}
            {stats.nextEligibleDate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Donation Eligibility
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                    {eligibilityProgress >= 100 ? 'Eligible to donate' : 'Next eligible date'}
                                </span>
                                <Badge variant={eligibilityProgress >= 100 ? 'default' : 'secondary'}>
                                    {eligibilityProgress >= 100 ? 'Eligible' : stats.nextEligibleDate}
                                </Badge>
                            </div>
                            <Progress value={eligibilityProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                {eligibilityProgress >= 100
                                    ? 'You are eligible to donate blood now'
                                    : `${Math.max(0, 56 - eligibilityDays)} days remaining until next donation`
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Blood Type Distribution */}
                {bloodTypeData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Donations by Blood Type</CardTitle>
                            <CardDescription>Distribution of donations across blood types</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={bloodTypeData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ bloodType, count }) => `${bloodType}: ${count}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {bloodTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Monthly Trend */}
                {monthlyData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Donation Trend</CardTitle>
                            <CardDescription>Donations and units collected over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="donations" fill="#3b82f6" name="Donations" />
                                        <Bar dataKey="units" fill="#ef4444" name="Units" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Health Metrics */}
            {stats.healthTrends && Object.keys(stats.healthTrends).some(key => stats.healthTrends[key as keyof typeof stats.healthTrends]) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5" />
                            Health Metrics Overview
                        </CardTitle>
                        <CardDescription>Average health metrics from recent donations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {stats.healthTrends.averageHemoglobin && (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-600">
                                        {stats.healthTrends.averageHemoglobin} g/dL
                                    </p>
                                    <p className="text-sm text-muted-foreground">Average Hemoglobin</p>
                                </div>
                            )}

                            {stats.healthTrends.averageBloodPressure && (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {stats.healthTrends.averageBloodPressure.systolic}/
                                        {stats.healthTrends.averageBloodPressure.diastolic}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Average Blood Pressure</p>
                                </div>
                            )}

                            {stats.healthTrends.averagePulse && (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        {stats.healthTrends.averagePulse} BPM
                                    </p>
                                    <p className="text-sm text-muted-foreground">Average Pulse</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}