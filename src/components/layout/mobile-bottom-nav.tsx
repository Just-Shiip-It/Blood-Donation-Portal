'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Search, Heart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    {
        href: '/',
        label: 'Home',
        icon: Home
    },
    {
        href: '/appointments',
        label: 'Appointments',
        icon: Calendar
    },
    {
        href: '/search',
        label: 'Search',
        icon: Search
    },
    {
        href: '/donations',
        label: 'Donations',
        icon: Heart
    },
    {
        href: '/profile',
        label: 'Profile',
        icon: User
    }
]

export function MobileBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t md:hidden">
            <div className="flex items-center justify-around px-2 py-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center px-3 py-2 rounded-lg touch-manipulation transition-colors min-w-0 flex-1",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            <Icon className="h-5 w-5 mb-1" />
                            <span className="text-xs font-medium truncate">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}