'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addDays, startOfDay } from 'date-fns'
import { CalendarIcon, MapPinIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { createAppointmentSchema, type CreateAppointmentInput } from '@/lib/validations/appointment'
import { toast } from 'sonner'

interface BloodBank {
    id: string
    name: string
    address: {
        street: string
        city: string
        state: string
        zipCode: string
    }
    phone: string
    operatingHours: Record<string, { open: number; close: number }>
    coordinates?: { lat: number; lng: number }
}

interface TimeSlot {
    bloodBankId: string
    date: Date
    available: boolean
}

interface AppointmentBookingFormProps {
    onSuccess?: () => void
}

export function AppointmentBookingForm({ onSuccess }: AppointmentBookingFormProps) {
    const [bloodBanks, setBloodBanks] = useState<BloodBank[]>([])
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [selectedBloodBank, setSelectedBloodBank] = useState<BloodBank | null>(null)
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
    const [locationRadius, setLocationRadius] = useState(25)
    const [showLocationFilter, setShowLocationFilter] = useState(false)

    const form = useForm<CreateAppointmentInput>({
        resolver: zodResolver(createAppointmentSchema),
        defaultValues: {
            notes: '',
        },
    })

    const fetchBloodBanks = useCallback(async () => {
        try {
            let url = '/api/bloodbanks'
            const params = new URLSearchParams()

            if (userLocation) {
                params.append('latitude', userLocation.latitude.toString())
                params.append('longitude', userLocation.longitude.toString())
                params.append('radius', locationRadius.toString())
            }

            if (params.toString()) {
                url += `?${params.toString()}`
            }

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch blood banks')

            const { data } = await response.json()
            setBloodBanks(data)
        } catch (error) {
            console.error('Error fetching blood banks:', error)
            toast.error('Failed to load blood banks')
        }
    }, [userLocation, locationRadius])

    useEffect(() => {
        fetchBloodBanks()
    }, [fetchBloodBanks])

    const fetchAvailableSlots = async (bloodBankId: string) => {
        try {
            setLoadingSlots(true)

            const startDate = startOfDay(new Date())
            const endDate = addDays(startDate, 30) // Next 30 days

            const params = new URLSearchParams({
                bloodBankId,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            })

            const response = await fetch(`/api/appointments/availability?${params}`)
            if (!response.ok) throw new Error('Failed to fetch availability')

            const { data } = await response.json()
            setAvailableSlots(data.filter((slot: TimeSlot) => slot.available))
        } catch (error) {
            console.error('Error fetching availability:', error)
            toast.error('Failed to load available time slots')
        } finally {
            setLoadingSlots(false)
        }
    }

    const handleBloodBankChange = (bloodBankId: string) => {
        const bloodBank = bloodBanks.find(bb => bb.id === bloodBankId)
        setSelectedBloodBank(bloodBank || null)
        form.setValue('bloodBankId', bloodBankId)

        if (bloodBank) {
            fetchAvailableSlots(bloodBankId)
        }
    }

    const requestLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    })
                    setShowLocationFilter(true)
                    toast.success('Location detected! Showing nearby blood banks.')
                },
                (error) => {
                    console.error('Error getting location:', error)
                    toast.error('Unable to get your location. Please select manually.')
                }
            )
        } else {
            toast.error('Geolocation is not supported by this browser.')
        }
    }

    const onSubmit = async (data: CreateAppointmentInput) => {
        try {
            setLoading(true)

            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to book appointment')
            }

            toast.success('Appointment booked successfully!')
            form.reset()
            setSelectedBloodBank(null)
            setAvailableSlots([])
            onSuccess?.()
        } catch (error) {
            console.error('Error booking appointment:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to book appointment')
        } finally {
            setLoading(false)
        }
    }

    const groupSlotsByDate = (slots: TimeSlot[]) => {
        const grouped: { [date: string]: TimeSlot[] } = {}

        slots.forEach(slot => {
            const dateKey = format(slot.date, 'yyyy-MM-dd')
            if (!grouped[dateKey]) {
                grouped[dateKey] = []
            }
            grouped[dateKey].push(slot)
        })

        return grouped
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Book Appointment</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Location Filter */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Find Blood Banks Near You</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={requestLocation}
                                    className="flex items-center gap-2"
                                >
                                    <MapPinIcon className="h-4 w-4" />
                                    Use My Location
                                </Button>
                            </div>

                            {showLocationFilter && userLocation && (
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="radius" className="text-sm">Radius:</Label>
                                    <Select
                                        value={locationRadius.toString()}
                                        onValueChange={(value) => setLocationRadius(parseInt(value))}
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 miles</SelectItem>
                                            <SelectItem value="25">25 miles</SelectItem>
                                            <SelectItem value="50">50 miles</SelectItem>
                                            <SelectItem value="100">100 miles</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Badge variant="secondary" className="text-xs">
                                        {bloodBanks.length} locations found
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Blood Bank Selection */}
                        <FormField
                            control={form.control}
                            name="bloodBankId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Blood Bank</FormLabel>
                                    <Select onValueChange={handleBloodBankChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a blood bank" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {bloodBanks.map((bloodBank) => (
                                                <SelectItem key={bloodBank.id} value={bloodBank.id}>
                                                    <div>
                                                        <div className="font-medium">{bloodBank.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {bloodBank.address.city}, {bloodBank.address.state}
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Blood Bank Details */}
                        {selectedBloodBank && (
                            <Card className="bg-muted/50">
                                <CardContent className="pt-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium">{selectedBloodBank.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedBloodBank.address.street}<br />
                                            {selectedBloodBank.address.city}, {selectedBloodBank.address.state} {selectedBloodBank.address.zipCode}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Phone: {selectedBloodBank.phone}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Time Slot Selection */}
                        {selectedBloodBank && (
                            <FormField
                                control={form.control}
                                name="appointmentDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Date & Time</FormLabel>
                                        <FormControl>
                                            <div className="space-y-4">
                                                {loadingSlots ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <LoadingSpinner />
                                                    </div>
                                                ) : availableSlots.length > 0 ? (
                                                    <div className="space-y-4 max-h-64 overflow-y-auto">
                                                        {Object.entries(groupSlotsByDate(availableSlots)).map(([date, slots]) => (
                                                            <div key={date} className="space-y-2">
                                                                <h5 className="font-medium text-sm">
                                                                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                                                                </h5>
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {slots.map((slot) => (
                                                                        <Button
                                                                            key={slot.date.toISOString()}
                                                                            type="button"
                                                                            variant={field.value === slot.date.toISOString() ? "default" : "outline"}
                                                                            size="sm"
                                                                            onClick={() => field.onChange(slot.date.toISOString())}
                                                                        >
                                                                            {format(slot.date, 'h:mm a')}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground py-4">
                                                        No available time slots found for the next 30 days.
                                                    </p>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any special requests or notes..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            disabled={loading || !form.watch('appointmentDate')}
                            className="w-full"
                        >
                            {loading ? <LoadingSpinner className="mr-2" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
                            Book Appointment
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}