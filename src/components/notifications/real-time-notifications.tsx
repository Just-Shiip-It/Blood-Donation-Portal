'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from '@/hooks/use-toast'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Notification {
    id: string
    type: 'appointment_reminder' | 'emergency_request' | 'appointment_confirmation' | 'appointment_cancellation'
    title: string
    message: string
    data?: Record<string, unknown>
    createdAt: string
    read: boolean
}

interface RealTimeNotificationsProps {
    userId: string
}

export function RealTimeNotifications({ userId }: RealTimeNotificationsProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isVisible, setIsVisible] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        // Load initial notifications
        loadNotifications()

        // Set up real-time subscription
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    handleNewNotification(newNotification)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

    const loadNotifications = async () => {
        try {
            // TODO: Implement actual API call to fetch notifications
            // const response = await fetch(`/api/notifications?userId=${userId}`)
            // const data = await response.json()
            // setNotifications(data.notifications)
            // setUnreadCount(data.notifications.filter(n => !n.read).length)

            // Placeholder for now
            console.log('Loading notifications for user:', userId)
        } catch (error) {
            console.error('Failed to load notifications:', error)
        }
    }

    const handleNewNotification = (notification: Notification) => {
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Show toast notification
        toast({
            title: notification.title,
            description: notification.message,
            duration: 5000
        })

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icon-192x192.png',
                tag: notification.id
            })
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            // TODO: Implement API call to mark notification as read
            // await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' })

            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, read: true } : n
                )
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            // TODO: Implement API call to mark all notifications as read
            // await fetch(`/api/notifications/read-all`, { method: 'PUT', body: JSON.stringify({ userId }) })

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            )
            setUnreadCount(0)
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error)
        }
    }

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                toast({
                    title: 'Notifications Enabled',
                    description: 'You will now receive browser notifications for urgent alerts'
                })
            }
        }
    }

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'emergency_request':
                return '🚨'
            case 'appointment_reminder':
                return '⏰'
            case 'appointment_confirmation':
                return '✅'
            case 'appointment_cancellation':
                return '❌'
            default:
                return '📢'
        }
    }



    return (
        <div className="relative">
            {/* Notification Bell */}
            <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setIsVisible(!isVisible)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
            </Button>

            {/* Notification Panel */}
            {isVisible && (
                <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Notifications</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsVisible(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        {unreadCount > 0 && (
                            <div className="flex items-center justify-between">
                                <CardDescription>
                                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                                </CardDescription>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="text-xs"
                                >
                                    Mark all read
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${!notification.read ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <span className="text-lg">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium truncate">
                                                        {notification.title}
                                                    </p>
                                                    {!notification.read && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>

                    {/* Browser notification permission prompt */}
                    {'Notification' in window && Notification.permission === 'default' && (
                        <div className="p-3 border-t bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-2">
                                Enable browser notifications for urgent alerts
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={requestNotificationPermission}
                                className="w-full text-xs"
                            >
                                Enable Notifications
                            </Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}