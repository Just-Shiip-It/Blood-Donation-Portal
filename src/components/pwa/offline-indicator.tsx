'use client'

import { useIsOnline } from '@/hooks/use-mobile'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WifiOff, Wifi } from 'lucide-react'
import { useState, useEffect } from 'react'

export function OfflineIndicator() {
    const isOnline = useIsOnline()
    const [showOfflineMessage, setShowOfflineMessage] = useState(false)
    const [showOnlineMessage, setShowOnlineMessage] = useState(false)

    useEffect(() => {
        if (!isOnline) {
            setShowOfflineMessage(true)
            setShowOnlineMessage(false)
        } else {
            if (showOfflineMessage) {
                setShowOnlineMessage(true)
                setTimeout(() => setShowOnlineMessage(false), 3000)
            }
            setShowOfflineMessage(false)
        }
    }, [isOnline, showOfflineMessage])

    if (showOnlineMessage) {
        return (
            <div className="fixed top-16 left-4 right-4 z-40 md:left-6 md:right-6">
                <Alert className="bg-green-50 border-green-200 text-green-800">
                    <Wifi className="h-4 w-4" />
                    <AlertDescription>
                        You&apos;re back online! All features are available.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (showOfflineMessage) {
        return (
            <div className="fixed top-16 left-4 right-4 z-40 md:left-6 md:right-6">
                <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                        You&apos;re offline. Some features may be limited.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return null
}