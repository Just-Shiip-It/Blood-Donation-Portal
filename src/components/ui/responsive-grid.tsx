import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
    cols?: {
        default?: number
        sm?: number
        md?: number
        lg?: number
        xl?: number
    }
    gap?: number
    children: React.ReactNode
}

export function ResponsiveGrid({
    className,
    cols = { default: 1, sm: 2, md: 3, lg: 4 },
    gap = 4,
    children,
    ...props
}: ResponsiveGridProps) {
    const gridClasses = cn(
        "grid",
        `gap-${gap}`,
        cols.default && `grid-cols-${cols.default}`,
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
        className
    )

    return (
        <div className={gridClasses} {...props}>
            {children}
        </div>
    )
}

interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
    spacing?: number
    children: React.ReactNode
}

export function ResponsiveStack({
    className,
    spacing = 4,
    children,
    ...props
}: ResponsiveStackProps) {
    return (
        <div
            className={cn(
                "flex flex-col",
                `space-y-${spacing}`,
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

interface MobileListProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    dividers?: boolean
}

export function MobileList({
    className,
    children,
    dividers = true,
    ...props
}: MobileListProps) {
    return (
        <div
            className={cn(
                "space-y-0",
                dividers && "[&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

interface MobileListItemProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    pressable?: boolean
    leading?: React.ReactNode
    trailing?: React.ReactNode
}

export function MobileListItem({
    className,
    children,
    pressable = false,
    leading,
    trailing,
    ...props
}: MobileListItemProps) {
    return (
        <div
            className={cn(
                "flex items-center py-3 px-4 sm:px-6",
                pressable && "touch-manipulation active:bg-accent transition-colors cursor-pointer",
                className
            )}
            {...props}
        >
            {leading && (
                <div className="mr-3 flex-shrink-0">
                    {leading}
                </div>
            )}
            <div className="flex-1 min-w-0">
                {children}
            </div>
            {trailing && (
                <div className="ml-3 flex-shrink-0">
                    {trailing}
                </div>
            )}
        </div>
    )
}