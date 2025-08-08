'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Heart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface HeaderProps {
    className?: string
}

export function Header({ className }: HeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
            <div className="container flex h-16 items-center">
                {/* Logo and Brand */}
                <div className="mr-4 flex items-center">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <Heart className="h-6 w-6 text-red-500" />
                        <span className="hidden font-bold sm:inline-block">
                            Blood Donation Portal
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="mr-4 hidden md:flex">
                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger>Donate</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <Link
                                                    className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                                    href="/appointments"
                                                >
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Schedule Donation
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Book your blood donation appointment today
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                        <li>
                                            <NavigationMenuLink asChild>
                                                <Link href="/eligibility" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                    <div className="text-sm font-medium leading-none">Check Eligibility</div>
                                                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                        See if you&apos;re eligible to donate
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                        <li>
                                            <NavigationMenuLink asChild>
                                                <Link href="/history" className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                                                    <div className="text-sm font-medium leading-none">Donation History</div>
                                                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                                        View your donation records
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/blood-banks" legacyBehavior passHref>
                                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                                        Blood Banks
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                            <NavigationMenuItem>
                                <Link href="/requests" legacyBehavior passHref>
                                    <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                                        Blood Requests
                                    </NavigationMenuLink>
                                </Link>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* Search and Actions */}
                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none md:max-w-sm">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search blood banks, locations..."
                                className="pl-8"
                            />
                        </div>
                    </div>
                    <nav className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button size="sm" asChild>
                            <Link href="/register">Sign Up</Link>
                        </Button>
                    </nav>
                </div>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="border-t md:hidden">
                    <div className="container py-4">
                        <nav className="flex flex-col space-y-4">
                            <Link
                                href="/appointments"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Schedule Donation
                            </Link>
                            <Link
                                href="/blood-banks"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Blood Banks
                            </Link>
                            <Link
                                href="/requests"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Blood Requests
                            </Link>
                            <Link
                                href="/eligibility"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Check Eligibility
                            </Link>
                            <Link
                                href="/history"
                                className="text-sm font-medium transition-colors hover:text-primary"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Donation History
                            </Link>
                        </nav>
                    </div>
                </div>
            )}
        </header>
    )
}