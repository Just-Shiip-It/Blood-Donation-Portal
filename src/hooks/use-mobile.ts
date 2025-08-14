'use client'

import { useState, useEffect } from 'react'

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkIsMobile()
        window.addEventListener('resize', checkIsMobile)

        return () => window.removeEventListener('resize', checkIsMobile)
    }, [])

    return isMobile
}

export function useScreenSize() {
    const [screenSize, setScreenSize] = useState({
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: false
    })

    useEffect(() => {
        const updateScreenSize = () => {
            const width = window.innerWidth
            const height = window.innerHeight

            setScreenSize({
                width,
                height,
                isMobile: width < 768,
                isTablet: width >= 768 && width < 1024,
                isDesktop: width >= 1024
            })
        }

        updateScreenSize()
        window.addEventListener('resize', updateScreenSize)

        return () => window.removeEventListener('resize', updateScreenSize)
    }, [])

    return screenSize
}

export function useIsOnline() {
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        const updateOnlineStatus = () => {
            setIsOnline(navigator.onLine)
        }

        updateOnlineStatus()
        window.addEventListener('online', updateOnlineStatus)
        window.addEventListener('offline', updateOnlineStatus)

        return () => {
            window.removeEventListener('online', updateOnlineStatus)
            window.removeEventListener('offline', updateOnlineStatus)
        }
    }, [])

    return isOnline
}