'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: {
        'en-US': enUS,
    },
})

interface AppointmentEvent {
    id: string
    title: string
    start: Date
    end: Date
    resource: {
        id: string
        status: string
        bloodBank: {
            name: string
            address: {
                street: string
                city: string
                state: string
                zipCode: string
            }
        }
        donor?: {
            firstName: string
            lastName: string
            bloodType: string
            phone?: string
        }
        notes?: string
    }
}

interface AppointmentCalendarProps {
    donorId?: string
    bloodBankId?: string
    onAppointmentSelect?: (appointment: AppointmentEvent['resource']) => void
}

export function AppointmentCalendar({
    bloodBankId,
    onAppointmentSelect
}: AppointmentCalendarProps) {
    const [events, setEvents] = useState<AppointmentEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null)
    const [showDetails, setShowDetails] = useState(false)

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true)

            let url = '/api/appointments'
            if (bloodBankId) {
                url = `/api/bloodbanks/${bloodBankId}/appointments`
            }

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch appointments')

            const { data } = await response.json()

            const appointmentEvents: AppointmentEvent[] = data.map((appointment: {
                id: string
                appointmentDate: string
                bloodBank: { name: string; address: Record<string, unknown> }
                donor?: { firstName: string; lastName: string }
                [key: string]: unknown
            }) => ({
                id: appointment.id,
                title: bloodBankId && appointment.donor
                    ? `${appointment.donor.firstName} ${appointment.donor.lastName}`
                    : appointment.bloodBank.name,
                start: new Date(appointment.appointmentDate),
                end: new Date(new Date(appointment.appointmentDate).getTime() + 60 * 60 * 1000), // 1 hour duration
                resource: appointment
            }))

            setEvents(appointmentEvents)
        } catch (error) {
            console.error('Error fetching appointments:', error)
            toast.error('Failed to load appointments')
        } finally {
            setLoading(false)
        }
    }, [bloodBankId])

    useEffect(() => {
        fetchAppointments()
    }, [fetchAppointments])

    const handleSelectEvent = (event: AppointmentEvent) => {
        setSelectedEvent(event)
        setShowDetails(true)
        onAppointmentSelect?.(event.resource)
    }

    const getEventStyle = (event: AppointmentEvent) => {
        const status = event.resource.status
        let backgroundColor = '#3174ad'

        switch (status) {
            case 'scheduled':
                backgroundColor = '#10b981' // green
                break
            case 'completed':
                backgroundColor = '#6b7280' // gray
                break
            case 'cancelled':
                backgroundColor = '#ef4444' // red
                break
            case 'no_show':
                backgroundColor = '#f59e0b' // yellow
                break
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-96">
                    <LoadingSpinner />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Appointment Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-96">
                        <Calendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            onSelectEvent={handleSelectEvent}
                            eventPropGetter={getEventStyle}
                            views={['month', 'week', 'day']}
                            defaultView="month"
                            popup
                        />
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span className="text-sm">Scheduled</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gray-500 rounded"></div>
                            <span className="text-sm">Completed</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span className="text-sm">Cancelled</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span className="text-sm">No Show</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appointment Details</DialogTitle>
                    </DialogHeader>

                    {selectedEvent && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium">Date & Time</h4>
                                <p className="text-sm text-muted-foreground">
                                    {format(selectedEvent.start, 'PPP p')}
                                </p>
                            </div>

                            <div>
                                <h4 className="font-medium">Status</h4>
                                <Badge variant={
                                    selectedEvent.resource.status === 'scheduled' ? 'default' :
                                        selectedEvent.resource.status === 'completed' ? 'secondary' :
                                            selectedEvent.resource.status === 'cancelled' ? 'destructive' :
                                                'outline'
                                }>
                                    {selectedEvent.resource.status}
                                </Badge>
                            </div>

                            {bloodBankId && selectedEvent.resource.donor ? (
                                <div>
                                    <h4 className="font-medium">Donor</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedEvent.resource.donor.firstName} {selectedEvent.resource.donor.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Blood Type: {selectedEvent.resource.donor.bloodType}
                                    </p>
                                    {selectedEvent.resource.donor.phone && (
                                        <p className="text-sm text-muted-foreground">
                                            Phone: {selectedEvent.resource.donor.phone}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <h4 className="font-medium">Blood Bank</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedEvent.resource.bloodBank.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedEvent.resource.bloodBank.address.street}, {selectedEvent.resource.bloodBank.address.city}
                                    </p>
                                </div>
                            )}

                            {selectedEvent.resource.notes && (
                                <div>
                                    <h4 className="font-medium">Notes</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedEvent.resource.notes}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDetails(false)}
                                >
                                    Close
                                </Button>
                                {selectedEvent.resource.status === 'scheduled' && !bloodBankId && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            // Handle cancellation
                                            setShowDetails(false)
                                        }}
                                    >
                                        Cancel Appointment
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}