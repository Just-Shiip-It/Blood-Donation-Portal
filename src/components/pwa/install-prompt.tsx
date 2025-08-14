'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showPrompt, setShowPrompt] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowPrompt(true)
        }

        const handleAppInstalled = () => {
            setIsInstalled(true)
            setShowPrompt(false)
            setDeferredPrompt(null)
        }

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

    const handleInstallClick = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            setShowPrompt(false)
        }

        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setShowPrompt(false)
        // Remember user dismissed for this session
        sessionStorage.setItem('pwa-prompt-dismissed', 'true')
    }

    // Don't show if already installed, dismissed, or no prompt available
    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null
    }

    // Check if user already dismissed this session
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
        return null
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-auto md:max-w-sm">
            <Card className="shadow-lg border-2">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                            <Download className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base">Install App</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <CardDescription className="text-sm">
                        Install Blood Donation Portal for quick access and offline features
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex space-x-2">
                        <Button onClick={handleInstallClick} size="sm" className="flex-1">
                            Install
                        </Button>
                        <Button variant="outline" onClick={handleDismiss} size="sm">
                            Later
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}