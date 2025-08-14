import * as React from "react"
import { cn } from "@/lib/utils"

const MobileCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        pressable?: boolean
        elevated?: boolean
    }
>(({ className, pressable = false, elevated = false, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            pressable && "touch-manipulation active:scale-[0.98] transition-transform duration-150",
            elevated && "shadow-md hover:shadow-lg transition-shadow",
            "p-4 sm:p-6", // More padding on mobile
            className
        )}
        {...props}
    />
))
MobileCard.displayName = "MobileCard"

const MobileCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 pb-4 sm:pb-6", className)}
        {...props}
    />
))
MobileCardHeader.displayName = "MobileCardHeader"

const MobileCardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg sm:text-xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
MobileCardTitle.displayName = "MobileCardTitle"

const MobileCardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm sm:text-base text-muted-foreground", className)}
        {...props}
    />
))
MobileCardDescription.displayName = "MobileCardDescription"

const MobileCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("pt-0", className)} {...props} />
))
MobileCardContent.displayName = "MobileCardContent"

const MobileCardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center pt-4 sm:pt-6", className)}
        {...props}
    />
))
MobileCardFooter.displayName = "MobileCardFooter"

export {
    MobileCard,
    MobileCardHeader,
    MobileCardFooter,
    MobileCardTitle,
    MobileCardDescription,
    MobileCardContent,
}