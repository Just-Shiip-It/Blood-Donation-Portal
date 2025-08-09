'use client'

import { useState } from 'react'
import { BloodBankRegistration, BloodBankDashboard } from '@/components/blood-bank'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function BloodBankPage() {
    const [registeredBloodBankId, setRegisteredBloodBankId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('register')

    const handleRegistrationSuccess = (bloodBankId: string) => {
        setRegisteredBloodBankId(bloodBankId)
        setActiveTab('dashboard')
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Blood Bank Management</h1>
                <p className="text-gray-600">
                    Register your blood bank and manage inventory levels with real-time monitoring
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="register">Register Blood Bank</TabsTrigger>
                    <TabsTrigger value="dashboard" disabled={!registeredBloodBankId}>
                        Dashboard
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Blood Bank Registration</CardTitle>
                            <CardDescription>
                                Register your blood bank to start managing inventory and appointments
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BloodBankRegistration onSuccess={handleRegistrationSuccess} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dashboard" className="mt-6">
                    {registeredBloodBankId ? (
                        <BloodBankDashboard bloodBankId={registeredBloodBankId} />
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-gray-500">
                                    Please register a blood bank first to access the dashboard
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Demo Section */}
            <div className="mt-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Demo Features</CardTitle>
                        <CardDescription>
                            Test the blood bank management system with sample data
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                This implementation includes:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Blood bank profile creation and management</li>
                                <li>Real-time inventory tracking with automatic alerts</li>
                                <li>Low stock and critical stock monitoring</li>
                                <li>Bulk inventory updates</li>
                                <li>Expiration date tracking</li>
                                <li>Comprehensive validation and error handling</li>
                                <li>Unit tests for all business logic</li>
                            </ul>

                            {registeredBloodBankId && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-800">
                                        ✅ Blood Bank registered successfully! ID: {registeredBloodBankId}
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">
                                        Switch to the Dashboard tab to manage your inventory
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}