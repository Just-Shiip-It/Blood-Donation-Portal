'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Shield,
    Search,
    Activity,
    Database,
    AlertTriangle,
    Filter
} from 'lucide-react'

interface AuditLogEntry {
    id: string
    userId?: string
    action: string
    resource: string
    resourceId?: string
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, unknown>
    timestamp: string
}

interface ActivityLogEntry {
    id: string
    userId?: string
    sessionId?: string
    action: string
    path?: string
    method?: string
    duration?: string
    statusCode?: string
    metadata?: Record<string, unknown>
    timestamp: string
}

interface AuditStats {
    totalEvents: number
    actionBreakdown: Array<{
        action: string
        count: number
    }>
    resourceBreakdown: Array<{
        resource: string
        count: number
    }>
}

export function AuditLogViewer() {
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
    const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([])
    const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('audit')

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [resourceFilter, setResourceFilter] = useState('')
    const [dateRange, setDateRange] = useState('7') // days

    useEffect(() => {
        fetchAuditData()
    }, [actionFilter, resourceFilter, dateRange])

    const fetchAuditData = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams()
            if (actionFilter) params.append('action', actionFilter)
            if (resourceFilter) params.append('resource', resourceFilter)

            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - parseInt(dateRange))

            params.append('startDate', startDate.toISOString())
            params.append('endDate', endDate.toISOString())

            const [auditResponse, activityResponse, statsResponse] = await Promise.all([
                fetch(`/api/admin/audit?type=audit&${params.toString()}`),
                fetch(`/api/admin/audit?type=activity&${params.toString()}`),
                fetch(`/api/admin/audit?type=stats&${params.toString()}`)
            ])

            if (!auditResponse.ok || !activityResponse.ok || !statsResponse.ok) {
                throw new Error('Failed to fetch audit data')
            }

            const [auditData, activityData, statsData] = await Promise.all([
                auditResponse.json(),
                activityResponse.json(),
                statsResponse.json()
            ])

            setAuditLogs(auditData.data)
            setActivityLogs(activityData.data)
            setAuditStats(statsData.data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const getActionBadgeVariant = (action: string) => {
        switch (action.toLowerCase()) {
            case 'create': return 'default'
            case 'update': return 'secondary'
            case 'delete': return 'destructive'
            case 'login': return 'outline'
            case 'logout': return 'outline'
            default: return 'secondary'
        }
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    const filteredAuditLogs = auditLogs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const filteredActivityLogs = activityLogs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.path && log.path.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const auditColumns = [
        {
            header: 'Timestamp',
            accessorKey: 'timestamp',
            cell: ({ row }: { row: { original: AuditLogEntry } }) => (
                <div className="text-sm font-mono">
                    {formatTimestamp(row.original.timestamp)}
                </div>
            )
        },
        {
            header: 'Action',
            accessorKey: 'action',
            cell: ({ row }: { row: { original: AuditLogEntry } }) => (
                <Badge variant={getActionBadgeVariant(row.original.action)}>
                    {row.original.action}
                </Badge>
            )
        },
        {
            header: 'Resource',
            accessorKey: 'resource',
            cell: ({ row }: { row: { original: AuditLogEntry } }) => (
                <div className="space-y-1">
                    <div className="font-medium">{row.original.resource}</div>
                    {row.original.resourceId && (
                        <div className="text-xs text-gray-500 font-mono">
                            ID: {row.original.resourceId.substring(0, 8)}...
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'User',
            accessorKey: 'userId',
            cell: ({ row }: { row: { original: AuditLogEntry } }) => (
                <div className="text-sm">
                    {row.original.userId ? (
                        <span className="font-mono">{row.original.userId.substring(0, 8)}...</span>
                    ) : (
                        <span className="text-gray-400">System</span>
                    )}
                </div>
            )
        },
        {
            header: 'Details',
            accessorKey: 'metadata',
            cell: ({ row }: { row: { original: AuditLogEntry } }) => (
                <div className="space-y-1">
                    {row.original.ipAddress && (
                        <div className="text-xs text-gray-600">
                            IP: {row.original.ipAddress}
                        </div>
                    )}
                    {row.original.metadata && (
                        <div className="text-xs text-gray-600">
                            {Object.keys(row.original.metadata).length} metadata fields
                        </div>
                    )}
                </div>
            )
        }
    ]

    const activityColumns = [
        {
            header: 'Timestamp',
            accessorKey: 'timestamp',
            cell: ({ row }: { row: { original: ActivityLogEntry } }) => (
                <div className="text-sm font-mono">
                    {formatTimestamp(row.original.timestamp)}
                </div>
            )
        },
        {
            header: 'Action',
            accessorKey: 'action',
            cell: ({ row }: { row: { original: ActivityLogEntry } }) => (
                <Badge variant="outline">
                    {row.original.action}
                </Badge>
            )
        },
        {
            header: 'Path',
            accessorKey: 'path',
            cell: ({ row }: { row: { original: ActivityLogEntry } }) => (
                <div className="space-y-1">
                    <div className="font-mono text-sm">{row.original.path}</div>
                    {row.original.method && (
                        <Badge variant="secondary" className="text-xs">
                            {row.original.method}
                        </Badge>
                    )}
                </div>
            )
        },
        {
            header: 'User',
            accessorKey: 'userId',
            cell: ({ row }: { row: { original: ActivityLogEntry } }) => (
                <div className="text-sm">
                    {row.original.userId ? (
                        <span className="font-mono">{row.original.userId.substring(0, 8)}...</span>
                    ) : (
                        <span className="text-gray-400">Anonymous</span>
                    )}
                </div>
            )
        },
        {
            header: 'Response',
            accessorKey: 'statusCode',
            cell: ({ row }: { row: { original: ActivityLogEntry } }) => (
                <div className="space-y-1">
                    {row.original.statusCode && (
                        <Badge
                            variant={row.original.statusCode.startsWith('2') ? 'default' :
                                row.original.statusCode.startsWith('4') ? 'destructive' : 'secondary'}
                        >
                            {row.original.statusCode}
                        </Badge>
                    )}
                    {row.original.duration && (
                        <div className="text-xs text-gray-600">
                            {row.original.duration}ms
                        </div>
                    )}
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Audit & Activity Logs</h1>
                    <p className="text-gray-600">Monitor system security and user activity</p>
                </div>
                <Button onClick={fetchAuditData} variant="outline">
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-800">{error}</span>
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            {auditStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{auditStats.totalEvents.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">
                                Last {dateRange} days
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Top Action</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {auditStats.actionBreakdown[0]?.action || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {auditStats.actionBreakdown[0]?.count || 0} occurrences
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Top Resource</CardTitle>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {auditStats.resourceBreakdown[0]?.resource || 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {auditStats.resourceBreakdown[0]?.count || 0} events
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Filter className="h-5 w-5" />
                        <span>Filters & Search</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Actions</SelectItem>
                                <SelectItem value="CREATE">Create</SelectItem>
                                <SelectItem value="UPDATE">Update</SelectItem>
                                <SelectItem value="DELETE">Delete</SelectItem>
                                <SelectItem value="LOGIN">Login</SelectItem>
                                <SelectItem value="LOGOUT">Logout</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={resourceFilter} onValueChange={setResourceFilter}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Resource" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Resources</SelectItem>
                                <SelectItem value="users">Users</SelectItem>
                                <SelectItem value="appointments">Appointments</SelectItem>
                                <SelectItem value="donations">Donations</SelectItem>
                                <SelectItem value="blood_requests">Blood Requests</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Last 24 hours</SelectItem>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Log Tables */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                    <TabsTrigger value="activity">Activity Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Audit Trail</CardTitle>
                            <CardDescription>
                                Security-relevant events and data changes
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={auditColumns}
                                data={filteredAuditLogs}
                                searchKey="action"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Logs</CardTitle>
                            <CardDescription>
                                User interactions and system usage
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={activityColumns}
                                data={filteredActivityLogs}
                                searchKey="action"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}