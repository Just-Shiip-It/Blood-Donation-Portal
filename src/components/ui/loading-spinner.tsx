'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
    text?: string
}

export function LoadingSpinner({
    size = 'md',
    className,
    text
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
    }

    return (
        <div className={cn("flex items-center justify-center", className)}>
            <div className="flex flex-col items-center space-y-2">
                <div
                    className={cn(
                        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
                        sizeClasses[size]
                    )}
                />
                {text && (
                    <p className="text-sm text-muted-foreground">{text}</p>
                )}
            </div>
        </div>
    )
}

interface LoadingStateProps {
    isLoading: boolean
    children: React.ReactNode
    fallback?: React.ReactNode
    text?: string
}

export function LoadingState({
    isLoading,
    children,
    fallback,
    text = 'Loading...'
}: LoadingStateProps) {
    if (isLoading) {
        return fallback || <LoadingSpinner text={text} />
    }

    return <>{children}</>
}

export function PageLoader({ text = 'Loading page...' }: { text?: string }) {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" text={text} />
        </div>
    )
}