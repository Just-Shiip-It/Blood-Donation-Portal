import Link from 'next/link'

export function Footer() {
    return (
        <footer className="border-t bg-background mt-auto">
            <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:py-8 md:h-24 md:flex-row md:py-0 px-4 sm:px-6">
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
                    <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground md:text-left">
                        Built for connecting donors, recipients, and blood banks to save lives.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Link
                        href="/privacy"
                        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground touch-manipulation py-1"
                    >
                        Privacy Policy
                    </Link>
                    <Link
                        href="/terms"
                        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground touch-manipulation py-1"
                    >
                        Terms of Service
                    </Link>
                    <Link
                        href="/contact"
                        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground touch-manipulation py-1"
                    >
                        Contact
                    </Link>
                </div>
            </div>
        </footer>
    )
}