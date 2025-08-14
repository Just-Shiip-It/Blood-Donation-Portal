'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { MobileCard, MobileCardContent, MobileCardDescription, MobileCardHeader, MobileCardTitle } from '@/components/ui/mobile-card'
import { ResponsiveGrid, ResponsiveStack, MobileList, MobileListItem } from '@/components/ui/responsive-grid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Calendar, MapPin, Phone, Mail, User } from 'lucide-react'
import { NotificationPreferences } from '@/components/notifications/notification-preferences'
import { useScreenSize } from '@/hooks/use-mobile'

export default function MobileTestPage() {
    const screenSize = useScreenSize()

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mobile Responsiveness Test</h1>
                    <p className="text-muted-foreground">
                        Screen: {screenSize.width}x{screenSize.height} |
                        {screenSize.isMobile ? ' Mobile' : ''}
                        {screenSize.isTablet ? ' Tablet' : ''}
                        {screenSize.isDesktop ? ' Desktop' : ''}
                    </p>
                </div>

                {/* Responsive Grid Test */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Responsive Grid</h2>
                    <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 3 }}>
                        <MobileCard pressable elevated>
                            <MobileCardHeader>
                                <MobileCardTitle className="flex items-center">
                                    <Heart className="h-5 w-5 mr-2 text-red-500" />
                                    Blood Donation
                                </MobileCardTitle>
                                <MobileCardDescription>
                                    Schedule your next donation appointment
                                </MobileCardDescription>
                            </MobileCardHeader>
                            <MobileCardContent>
                                <Button className="w-full touch-target">Book Appointment</Button>
                            </MobileCardContent>
                        </MobileCard>

                        <MobileCard pressable elevated>
                            <MobileCardHeader>
                                <MobileCardTitle className="flex items-center">
                                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                                    Appointments
                                </MobileCardTitle>
                                <MobileCardDescription>
                                    View and manage your appointments
                                </MobileCardDescription>
                            </MobileCardHeader>
                            <MobileCardContent>
                                <Button variant="outline" className="w-full touch-target">View All</Button>
                            </MobileCardContent>
                        </MobileCard>

                        <MobileCard pressable elevated>
                            <MobileCardHeader>
                                <MobileCardTitle className="flex items-center">
                                    <MapPin className="h-5 w-5 mr-2 text-green-500" />
                                    Blood Banks
                                </MobileCardTitle>
                                <MobileCardDescription>
                                    Find nearby blood banks and centers
                                </MobileCardDescription>
                            </MobileCardHeader>
                            <MobileCardContent>
                                <Button variant="outline" className="w-full touch-target">Find Nearby</Button>
                            </MobileCardContent>
                        </MobileCard>
                    </ResponsiveGrid>
                </section>

                {/* Mobile List Test */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Mobile List</h2>
                    <MobileCard>
                        <MobileList>
                            <MobileListItem
                                pressable
                                leading={<User className="h-5 w-5 text-muted-foreground" />}
                                trailing={<Badge variant="secondary">Active</Badge>}
                            >
                                <div>
                                    <p className="font-medium">John Doe</p>
                                    <p className="text-sm text-muted-foreground">O+ Blood Type</p>
                                </div>
                            </MobileListItem>

                            <MobileListItem
                                pressable
                                leading={<Phone className="h-5 w-5 text-muted-foreground" />}
                                trailing={<span className="text-sm text-muted-foreground">Call</span>}
                            >
                                <div>
                                    <p className="font-medium">Contact Support</p>
                                    <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
                                </div>
                            </MobileListItem>

                            <MobileListItem
                                pressable
                                leading={<Mail className="h-5 w-5 text-muted-foreground" />}
                                trailing={<Badge variant="destructive">3</Badge>}
                            >
                                <div>
                                    <p className="font-medium">Messages</p>
                                    <p className="text-sm text-muted-foreground">You have unread messages</p>
                                </div>
                            </MobileListItem>
                        </MobileList>
                    </MobileCard>
                </section>

                {/* Touch Interaction Test */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Touch Interactions</h2>
                    <ResponsiveStack spacing={4}>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="touch-target">Small Button</Button>
                            <Button className="touch-target">Default Button</Button>
                            <Button size="lg" className="touch-target">Large Button</Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="touch-target">Outline</Button>
                            <Button variant="secondary" className="touch-target">Secondary</Button>
                            <Button variant="destructive" className="touch-target">Destructive</Button>
                        </div>
                    </ResponsiveStack>
                </section>

                {/* Notification Preferences Test */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">PWA Features</h2>
                    <NotificationPreferences />
                </section>

                {/* Device Info */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Device Information</h2>
                    <MobileCard>
                        <MobileCardContent>
                            <div className="space-y-2 text-sm">
                                <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
                                <p><strong>Screen Size:</strong> {screenSize.width} x {screenSize.height}</p>
                                <p><strong>Device Type:</strong>
                                    {screenSize.isMobile && ' Mobile'}
                                    {screenSize.isTablet && ' Tablet'}
                                    {screenSize.isDesktop && ' Desktop'}
                                </p>
                                <p><strong>Touch Support:</strong> {typeof window !== 'undefined' && 'ontouchstart' in window ? 'Yes' : 'No'}</p>
                                <p><strong>PWA Support:</strong> {typeof window !== 'undefined' && 'serviceWorker' in navigator ? 'Yes' : 'No'}</p>
                                <p><strong>Notification Support:</strong> {typeof window !== 'undefined' && 'Notification' in window ? 'Yes' : 'No'}</p>
                            </div>
                        </MobileCardContent>
                    </MobileCard>
                </section>
            </div>
        </MainLayout>
    )
}