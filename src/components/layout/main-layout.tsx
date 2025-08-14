import { Header } from './header'
import { Footer } from './footer'
import { MobileBottomNav } from './mobile-bottom-nav'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { OfflineIndicator } from '@/components/pwa/offline-indicator'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
    children: React.ReactNode
    className?: string
    showHeader?: boolean
    showFooter?: boolean
    showMobileNav?: boolean
}

export function MainLayout({
    children,
    className,
    showHeader = true,
    showFooter = true,
    showMobileNav = true
}: MainLayoutProps) {
    return (
        <div className={cn("relative flex min-h-screen flex-col", className)}>
            {showHeader && <Header />}
            <OfflineIndicator />
            <main className={cn(
                "flex-1 container mx-auto px-4 py-4 sm:py-6 md:px-6 lg:px-8 max-w-7xl",
                showMobileNav && "pb-20 md:pb-4" // Add bottom padding for mobile nav
            )}>
                {children}
            </main>
            {showFooter && <Footer />}
            {showMobileNav && <MobileBottomNav />}
            <InstallPrompt />
        </div>
    )
}