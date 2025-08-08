'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LogoutButtonProps {
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'sm' | 'default' | 'lg'
    className?: string
    children?: React.ReactNode
}

export function LogoutButton({
    variant = 'outline',
    size = 'default',
    className,
    children = 'Sign Out'
}: LogoutButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { logout } = useAuthContext()
    const router = useRouter()

    const handleLogout = async () => {
        setIsLoading(true)

        try {
            await logout()
            toast.success('Logged out successfully')
            router.push('/login')
            router.refresh()
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('Failed to log out')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleLogout}
            disabled={isLoading}
        >
            {isLoading ? 'Signing out...' : children}
        </Button>
    )
}