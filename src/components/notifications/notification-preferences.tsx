'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Bell, Smartphone } from 'lucide-react'
import { PushNotificationService } from '@/lib/services/push-notifications'
import { toast } from '@/hooks/use-toast'

interface NotificationPreferences {
    pushEnabled: boolean
    urgentRequests: boolean
    appointmentReminders: boolean
    donationEligible: boolean
    inventoryAlerts: boolean
    appointmentConfirmations: boolean
}

export function NotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        pushEnabled: false,
        urgentRequests: true,
        appointmentReminders: true,
        donationEligible: true,
        inventoryAlerts: false,
        appointmentConfirmations: true
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isSupported, setIsSupported] = useState(false)

    useEffect(() => {
        const checkSupport = async () => {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window
            setIsSupported(supported)

            if (supported) {
                const pushService = PushNotificationService.getInstance()
                const subscription = await pushService.getSubscription()
                setPreferences(prev => ({
                    ...prev,
                    pushEnabled: !!subscription
                }))
            }
        }

        checkSupport()
        loadPreferences()
    }, [])

    const loadPreferences = () => {
        const saved = localStorage.getItem('notification-preferences')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setPreferences(prev => ({ ...prev, ...parsed }))
            } catch (error) {
                console.error('Failed to load notification preferences:', error)
            }
        }
    }

    const savePreferences = (newPreferences: NotificationPreferences) => {
        localStorage.setItem('notification-preferences', JSON.stringify(newPreferences))
        setPreferences(newPreferences)
    }

    const handlePushToggle = async (enabled: boolean) => {
        if (!isSupported) {
            toast({
                title: "Not Supported",
                description: "Push notifications are not supported on this device.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        const pushService = PushNotificationService.getInstance()

        try {
            if (enabled) {
                const permission = await pushService.requestPermission()

                if (permission === 'granted') {
                    await pushService.subscribe()
                    toast({
                        title: "Notifications Enabled",
                        description: "You'll now receive push notifications for important updates."
                    })
                } else {
                    toast({
                        title: "Permission Denied",
                        description: "Please enable notifications in your browser settings.",
                        variant: "destructive"
                    })
                    enabled = false
                }
            } else {
                await pushService.unsubscribe()
                toast({
                    title: "Notifications Disabled",
                    description: "You won't receive push notifications anymore."
                })
            }

            savePreferences({ ...preferences, pushEnabled: enabled })
        } catch (error) {
            console.error('Failed to toggle push notifications:', error)
            toast({
                title: "Error",
                description: "Failed to update notification settings. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value }
        savePreferences(newPreferences)
    }

    const testNotification = async () => {
        if (!preferences.pushEnabled) {
            toast({
                title: "Enable Notifications",
                description: "Please enable push notifications first.",
                variant: "destructive"
            })
            return
        }

        const pushService = PushNotificationService.getInstance()
        await pushService.showNotification({
            title: "Test Notification",
            body: "This is a test notification from Blood Donation Portal",
            tag: "test"
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Bell className="h-5 w-5" />
                        <span>Push Notifications</span>
                    </CardTitle>
                    <CardDescription>
                        Receive real-time notifications for important updates and reminders
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Enable Push Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                {isSupported
                                    ? "Receive notifications even when the app is closed"
                                    : "Not supported on this device"
                                }
                            </p>
                        </div>
                        <Switch
                            checked={preferences.pushEnabled}
                            onCheckedChange={handlePushToggle}
                            disabled={!isSupported || isLoading}
                        />
                    </div>

                    {preferences.pushEnabled && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={testNotification}
                            className="w-full sm:w-auto"
                        >
                            <Smartphone className="h-4 w-4 mr-2" />
                            Test Notification
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notification Types</CardTitle>
                    <CardDescription>
                        Choose which types of notifications you want to receive
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Urgent Blood Requests</Label>
                                <p className="text-sm text-muted-foreground">
                                    Critical blood shortage alerts for your blood type
                                </p>
                            </div>
                            <Switch
                                checked={preferences.urgentRequests}
                                onCheckedChange={(value) => handlePreferenceChange('urgentRequests', value)}
                                disabled={!preferences.pushEnabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Appointment Reminders</Label>
                                <p className="text-sm text-muted-foreground">
                                    Reminders for upcoming donation appointments
                                </p>
                            </div>
                            <Switch
                                checked={preferences.appointmentReminders}
                                onCheckedChange={(value) => handlePreferenceChange('appointmentReminders', value)}
                                disabled={!preferences.pushEnabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Donation Eligibility</Label>
                                <p className="text-sm text-muted-foreground">
                                    When you become eligible to donate again
                                </p>
                            </div>
                            <Switch
                                checked={preferences.donationEligible}
                                onCheckedChange={(value) => handlePreferenceChange('donationEligible', value)}
                                disabled={!preferences.pushEnabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Appointment Confirmations</Label>
                                <p className="text-sm text-muted-foreground">
                                    Confirmations when appointments are booked or changed
                                </p>
                            </div>
                            <Switch
                                checked={preferences.appointmentConfirmations}
                                onCheckedChange={(value) => handlePreferenceChange('appointmentConfirmations', value)}
                                disabled={!preferences.pushEnabled}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Inventory Alerts</Label>
                                <p className="text-sm text-muted-foreground">
                                    Blood bank inventory updates (for blood bank staff)
                                </p>
                            </div>
                            <Switch
                                checked={preferences.inventoryAlerts}
                                onCheckedChange={(value) => handlePreferenceChange('inventoryAlerts', value)}
                                disabled={!preferences.pushEnabled}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}