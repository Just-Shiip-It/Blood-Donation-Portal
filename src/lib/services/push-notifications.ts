'use client'

export interface NotificationPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: unknown
    actions?: Array<{
        action: string
        title: string
        icon?: string
    }>
}

export class PushNotificationService {
    private static instance: PushNotificationService
    private registration: ServiceWorkerRegistration | null = null

    private constructor() { }

    static getInstance(): PushNotificationService {
        if (!PushNotificationService.instance) {
            PushNotificationService.instance = new PushNotificationService()
        }
        return PushNotificationService.instance
    }

    async initialize(): Promise<boolean> {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications are not supported')
            return false
        }

        try {
            this.registration = await navigator.serviceWorker.ready
            return true
        } catch (error) {
            console.error('Failed to initialize push notifications:', error)
            return false
        }
    }

    async requestPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            return 'denied'
        }

        if (Notification.permission === 'granted') {
            return 'granted'
        }

        if (Notification.permission === 'denied') {
            return 'denied'
        }

        const permission = await Notification.requestPermission()
        return permission
    }

    async subscribe(): Promise<PushSubscription | null> {
        if (!this.registration) {
            await this.initialize()
        }

        if (!this.registration) {
            return null
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true
            })

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription)
            return subscription
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error)
            return null
        }
    }

    async unsubscribe(): Promise<boolean> {
        if (!this.registration) {
            return false
        }

        try {
            const subscription = await this.registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()
                // Remove subscription from server
                await this.removeSubscriptionFromServer(subscription)
            }
            return true
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error)
            return false
        }
    }

    async getSubscription(): Promise<PushSubscription | null> {
        if (!this.registration) {
            await this.initialize()
        }

        if (!this.registration) {
            return null
        }

        return await this.registration.pushManager.getSubscription()
    }

    async showNotification(payload: NotificationPayload): Promise<void> {
        if (!this.registration) {
            // Fallback to browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icons/icon-192x192.png',
                    badge: payload.badge || '/icons/icon-72x72.png',
                    tag: payload.tag,
                    data: payload.data
                })
            }
            return
        }

        await this.registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-72x72.png',
            tag: payload.tag,
            data: payload.data,
            requireInteraction: true
        })
    }

    private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
        try {
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON()
                })
            })
        } catch (error) {
            console.error('Failed to send subscription to server:', error)
        }
    }

    private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
        try {
            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscription.toJSON()
                })
            })
        } catch (error) {
            console.error('Failed to remove subscription from server:', error)
        }
    }

    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }
}

// Notification types for the blood donation portal
export const NotificationTypes = {
    URGENT_BLOOD_REQUEST: 'urgent_blood_request',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    DONATION_ELIGIBLE: 'donation_eligible',
    INVENTORY_LOW: 'inventory_low',
    APPOINTMENT_CONFIRMED: 'appointment_confirmed'
} as const

export type NotificationType = typeof NotificationTypes[keyof typeof NotificationTypes]