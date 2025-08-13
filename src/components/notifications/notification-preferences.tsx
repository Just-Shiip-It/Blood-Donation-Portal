'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { NotificationPreferences } from '@/lib/services/notification'

interface NotificationPreferencesProps {
    userId: string
    initialPreferences?: NotificationPreferences
}

export function NotificationPreferencesComponent({ userId, initialPreferences }: NotificationPreferencesProps) {
    const [preferences, setPreferences] = useState<NotificationPreferences>(
        initialPreferences || {
            email: true,
            sms: false,
            push: true,
            reminderHours: 24
        }
    )
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (!initialPreferences) {
            loadPreferences()
        }
    }, [userId, initialPreferences]) // eslint-disable-line react-hooks/exhaustive-deps

    const loadPreferences = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/notifications/preferences?userId=${userId}`)
            if (response.ok) {
                const data = await response.json()
                setPreferences(data.preferences)
            }
        } catch (error) {
            console.error('Failed to load preferences:', error)
            toast({
                title: 'Error',
                description: 'Failed to load notification preferences',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const savePreferences = async () => {
        setIsSaving(true)
        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    preferences
                })
            })

            if (response.ok) {
                toast({
                    title: 'Success',
                    description: 'Notification preferences updated successfully'
                })
            } else {
                throw new Error('Failed to save preferences')
            }
        } catch (error) {
            console.error('Failed to save preferences:', error)
            toast({
                title: 'Error',
                description: 'Failed to save notification preferences',
                variant: 'destructive'
            })
        } finally {
            setIsSaving(false)
        }
    }

    const updatePreference = (key: keyof NotificationPreferences, value: boolean | number) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }))
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Loading your notification settings...</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                    Choose how you&apos;d like to receive notifications about appointments and urgent blood requests
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="email-notifications">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive appointment confirmations and reminders via email
                            </p>
                        </div>
                        <Switch
                            id="email-notifications"
                            checked={preferences.email}
                            onCheckedChange={(checked: boolean) => updatePreference('email', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="sms-notifications">SMS Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive text message reminders and urgent alerts
                            </p>
                        </div>
                        <Switch
                            id="sms-notifications"
                            checked={preferences.sms}
                            onCheckedChange={(checked: boolean) => updatePreference('sms', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="push-notifications">Push Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive browser notifications for urgent blood requests
                            </p>
                        </div>
                        <Switch
                            id="push-notifications"
                            checked={preferences.push}
                            onCheckedChange={(checked: boolean) => updatePreference('push', checked)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reminder-timing">Appointment Reminder Timing</Label>
                    <Select
                        value={preferences.reminderHours.toString()}
                        onValueChange={(value) => updatePreference('reminderHours', parseInt(value))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select reminder timing" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2">2 hours before</SelectItem>
                            <SelectItem value="6">6 hours before</SelectItem>
                            <SelectItem value="12">12 hours before</SelectItem>
                            <SelectItem value="24">24 hours before</SelectItem>
                            <SelectItem value="48">48 hours before</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        How far in advance would you like to receive appointment reminders?
                    </p>
                </div>

                <div className="pt-4 border-t">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-amber-800">
                                    Emergency Notifications
                                </h3>
                                <p className="mt-1 text-sm text-amber-700">
                                    You will always receive critical emergency blood request notifications regardless of these settings, as they are essential for life-saving situations.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={savePreferences}
                        disabled={isSaving}
                        className="min-w-[120px]"
                    >
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}