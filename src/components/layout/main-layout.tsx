import { Header } from './header'
import { Footer } from './footer'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
    children: React.ReactNode
    className?: string
    showHeader?: boolean
    showFooter?: boolean
}

export function MainLayout({
    children,
    className,
    showHeader = true,
    showFooter = true
}: MainLayoutProps) {
    return (
        <div className={cn("relative flex min-h-screen flex-col", className)}>
            {showHeader && <Header />}
            <main className="flex-1 container mx-auto px-4 py-6 md:px-6 lg:px-8">
                {children}
            </main>
            {showFooter && <Footer />}
        </div>
    )
}