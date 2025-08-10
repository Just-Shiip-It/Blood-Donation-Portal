'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts'
import {
    Activity,
    TrendingUp,
    Award,
    Calendar,
    AlertCircle,
    CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { HealthInsightData } from '@/lib/services/donation-history'

interface HealthInsightsProps {
    donorId: string
}

export default function HealthInsights({ donorId }: HealthInsightsProps) {
    const [period, setPeriod] = useState<'3months' | '6months' | '1year' | '2years' | 'all'>('1year')

    const { data, isLoading, error } = useQuery<{ donor: { id: string; firstName: string; lastName: string }; insights: HealthInsightData }>({
        queryKey: ['health-insights', { donorId, period }],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.append('donorId', donorId)
            params.append('period', period)

            const response = await fetch(`/api/donations/insights?${params}`)
            if (!response.ok) {
                throw new Error('Failed to fetch health insights')
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch health insights')
            }

            return result.data
        }
    })

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center text-red-600">
                        <p>Error loading health insights</p>
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

    if (!data) {
        return null
    }

    const { donor, insights } = data

    // Prepare chart data
    const hemoglobinData = insights.healthMetricsTrends.hemoglobin.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        value: item.value,
        fullDate: item.date
    }))

    const bloodPressureData = insights.healthMetricsTrends.bloodPressure.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        systolic: item.systolic,
        diastolic: item.diastolic,
        fullDate: item.date
    }))

    const pulseData = insights.healthMetricsTrends.pulse.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        value: item.value,
        fullDate: item.date
    }))

    const weightData = insights.healthMetricsTrends.weight.map(item => ({
        date: format(new Date(item.date), 'MMM dd'),
        value: item.value,
        fullDate: item.date
    }))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Health Insights</h2>
                    <p className="text-muted-foreground">
                        Health trends and achievements for {donor.firstName} {donor.lastName}
                    </p>
                </div>

                <Select value={period} onValueChange={(value) => setPeriod(value as '3months' | '6months' | '1year' | '2years' | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="3months">Last 3 Months</SelectItem>
                        <SelectItem value="6months">Last 6 Months</SelectItem>
                        <SelectItem value="1year">Last Year</SelectItem>
                        <SelectItem value="2years">Last 2 Years</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Donation Frequency Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
                                <p className="text-2xl font-bold">{insights.donationFrequency.totalDonations}</p>
                            </div>
                            <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">This Year</p>
                                <p className="text-2xl font-bold">{insights.donationFrequency.donationsThisYear}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Days Between</p>
                                <p className="text-2xl font-bold">{insights.donationFrequency.averageDaysBetweenDonations}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Eligibility Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {insights.eligibilityStatus.isEligible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                        Donation Eligibility Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Current Status</span>
                            <Badge variant={insights.eligibilityStatus.isEligible ? 'default' : 'secondary'}>
                                {insights.eligibilityStatus.isEligible ? 'Eligible' : 'Not Eligible'}
                            </Badge>
                        </div>

                        {!insights.eligibilityStatus.isEligible && insights.eligibilityStatus.nextEligibleDate && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Next eligible date</span>
                                    <span className="text-sm font-medium">
                                        {format(new Date(insights.eligibilityStatus.nextEligibleDate), 'PPP')}
                                    </span>
                                </div>
                                <Progress
                                    value={Math.min((insights.eligibilityStatus.daysSinceLastDonation / 56) * 100, 100)}
                                    className="h-2"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {Math.max(0, 56 - insights.eligibilityStatus.daysSinceLastDonation)} days remaining
                                </p>
                            </div>
                        )}

                        {insights.eligibilityStatus.reasonsForIneligibility && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Reasons for ineligibility:</p>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                    {insights.eligibilityStatus.reasonsForIneligibility.map((reason, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <AlertCircle className="h-3 w-3" />
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Health Metrics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hemoglobin Trend */}
                {hemoglobinData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Hemoglobin Levels</CardTitle>
                            <CardDescription>Track your hemoglobin levels over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={hemoglobinData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                                        <Tooltip
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload[0]) {
                                                    return format(new Date(payload[0].payload.fullDate), 'PPP')
                                                }
                                                return label
                                            }}
                                            formatter={(value) => [`${value} g/dL`, 'Hemoglobin']}
                                        />
                                        <ReferenceLine y={12.5} stroke="#22c55e" strokeDasharray="5 5" label="Normal Min" />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#ef4444"
                                            strokeWidth={2}
                                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Blood Pressure Trend */}
                {bloodPressureData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Blood Pressure</CardTitle>
                            <CardDescription>Monitor your blood pressure readings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={bloodPressureData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload[0]) {
                                                    return format(new Date(payload[0].payload.fullDate), 'PPP')
                                                }
                                                return label
                                            }}
                                            formatter={(value, name) => [
                                                `${value} mmHg`,
                                                name === 'systolic' ? 'Systolic' : 'Diastolic'
                                            ]}
                                        />
                                        <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="5 5" label="Normal Systolic" />
                                        <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="5 5" label="Normal Diastolic" />
                                        <Line
                                            type="monotone"
                                            dataKey="systolic"
                                            stroke="#ef4444"
                                            strokeWidth={2}
                                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="diastolic"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pulse Trend */}
                {pulseData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pulse Rate</CardTitle>
                            <CardDescription>Your heart rate during donations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={pulseData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload[0]) {
                                                    return format(new Date(payload[0].payload.fullDate), 'PPP')
                                                }
                                                return label
                                            }}
                                            formatter={(value) => [`${value} BPM`, 'Pulse']}
                                        />
                                        <ReferenceLine y={60} stroke="#22c55e" strokeDasharray="5 5" label="Normal Min" />
                                        <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="5 5" label="Normal Max" />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Weight Trend */}
                {weightData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Weight Tracking</CardTitle>
                            <CardDescription>Monitor your weight over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={weightData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                                        <Tooltip
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload[0]) {
                                                    return format(new Date(payload[0].payload.fullDate), 'PPP')
                                                }
                                                return label
                                            }}
                                            formatter={(value) => [`${value} lbs`, 'Weight']}
                                        />
                                        <ReferenceLine y={110} stroke="#22c55e" strokeDasharray="5 5" label="Min Required" />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#06b6d4"
                                            strokeWidth={2}
                                            dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Achievements */}
            {insights.achievements.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Achievements
                        </CardTitle>
                        <CardDescription>Your donation milestones and health achievements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {insights.achievements.map((achievement, index) => (
                                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                                    <div className={`p-2 rounded-full ${achievement.type === 'milestone' ? 'bg-blue-100 text-blue-600' :
                                        achievement.type === 'health' ? 'bg-green-100 text-green-600' :
                                            'bg-purple-100 text-purple-600'
                                        }`}>
                                        <Award className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{achievement.title}</h4>
                                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {format(new Date(achievement.achievedDate), 'PPP')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}