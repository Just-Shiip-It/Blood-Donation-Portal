'use client'

import { useState } from 'react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { DataTable } from './data-table'
import { LoadingSpinner, LoadingState } from './loading-spinner'
import { ErrorBoundary, ErrorDisplay } from './error-boundary'
import { notifications } from './notification-system'
import { ColumnDef } from '@tanstack/react-table'

// Demo data for DataTable
interface DemoData {
    id: string
    name: string
    bloodType: string
    lastDonation: string
    status: string
}

const demoData: DemoData[] = [
    {
        id: '1',
        name: 'John Doe',
        bloodType: 'O+',
        lastDonation: '2024-01-15',
        status: 'Eligible'
    },
    {
        id: '2',
        name: 'Jane Smith',
        bloodType: 'A-',
        lastDonation: '2024-02-20',
        status: 'Waiting'
    },
    {
        id: '3',
        name: 'Mike Johnson',
        bloodType: 'B+',
        lastDonation: '2024-01-30',
        status: 'Eligible'
    }
]

const columns: ColumnDef<DemoData>[] = [
    {
        accessorKey: 'name',
        header: 'Name',
    },
    {
        accessorKey: 'bloodType',
        header: 'Blood Type',
    },
    {
        accessorKey: 'lastDonation',
        header: 'Last Donation',
    },
    {
        accessorKey: 'status',
        header: 'Status',
    },
]

export function UIComponentsDemo() {
    const [isLoading, setIsLoading] = useState(false)
    const [showError, setShowError] = useState(false)

    const handleLoadingDemo = () => {
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 2000)
    }

    const handleNotificationDemo = () => {
        notifications.success('Demo notification!')
        setTimeout(() => {
            notifications.appointmentBooked('March 15, 2024', 'City Blood Bank')
        }, 1000)
        setTimeout(() => {
            notifications.urgentBloodRequest('O-', 'General Hospital')
        }, 2000)
    }

    if (showError) {
        throw new Error('Demo error for testing error boundary')
    }

    return (
        <div className="space-y-8 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>UI Components Demo</CardTitle>
                    <CardDescription>
                        Demonstration of all core UI components for the Blood Donation Portal
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Loading States Demo */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Loading States</h3>
                        <div className="flex gap-4">
                            <Button onClick={handleLoadingDemo}>
                                Test Loading State
                            </Button>
                            <LoadingSpinner size="sm" />
                            <LoadingSpinner size="md" />
                            <LoadingSpinner size="lg" />
                        </div>
                        <LoadingState isLoading={isLoading}>
                            <p>Content loaded successfully!</p>
                        </LoadingState>
                    </div>

                    {/* Notifications Demo */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Notification System</h3>
                        <div className="flex gap-2">
                            <Button onClick={handleNotificationDemo}>
                                Show Notifications
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => notifications.error('Test error message')}
                            >
                                Show Error
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => notifications.warning('Test warning')}
                            >
                                Show Warning
                            </Button>
                        </div>
                    </div>

                    {/* Error Handling Demo */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Error Handling</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => setShowError(true)}
                            >
                                Trigger Error Boundary
                            </Button>
                        </div>
                        <ErrorDisplay
                            title="Demo Error"
                            message="This is a demo error display component"
                            onRetry={() => console.log('Retry clicked')}
                        />
                    </div>

                    {/* Data Table Demo */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Data Table</h3>
                        <DataTable
                            columns={columns}
                            data={demoData}
                            searchKey="name"
                            searchPlaceholder="Search donors..."
                            showExport
                            onExport={() => notifications.info('Export functionality would be implemented here')}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Wrapper with Error Boundary for demo
export function UIComponentsDemoWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <UIComponentsDemo />
        </ErrorBoundary>
    )
}