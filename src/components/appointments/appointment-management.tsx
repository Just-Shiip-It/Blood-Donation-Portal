'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ClockIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AppointmentCalendar } from './appointment-calendar'
import { AppointmentBookingForm } from './appointment-booking-form'
import { toast } from 'sonner'

const getStatusColor = (status: string) => {
    switch (status) {
        case 'scheduled':
            return 'default'
        case 'completed':
            return 'secondary'
        case 'cancelled':
            return 'destructive'
        case 'no_show':
            return 'outline'
        default:
            return 'default'
    }
}

interface Appointment {
    id: string
    appointmentDate: string
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
    notes?: string
    reminderSent: boolean
    createdAt: string
    bloodBank: {
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
    }
}

interface AppointmentManagementProps {
    userType: 'donor' | 'blood_bank'
    bloodBankId?: string
}

export function AppointmentManagement({ userType, bloodBankId }: AppointmentManagementProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [showBookingForm, setShowBookingForm] = useState(false)
    const [activeTab, setActiveTab] = useState('upcoming')

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true)

            let url = '/api/appointments'
            if (userType === 'blood_bank' && bloodBankId) {
                url = `/api/bloodbanks/${bloodBankId}/appointments`
            }

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch appointments')

            const { data } = await response.json()
            setAppointments(data)
        } catch (error) {
            console.error('Error fetching appointments:', error)
            toast.error('Failed to load appointments')
        } finally {
            setLoading(false)
        }
    }, [userType, bloodBankId])

    useEffect(() => {
        fetchAppointments()
    }, [fetchAppointments])

    const cancelAppointment = async (appointmentId: string) => {
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to cancel appointment')
            }

            toast.success('Appointment cancelled successfully')
            fetchAppointments()
            setSelectedAppointment(null)
        } catch (error) {
            console.error('Error cancelling appointment:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment')
        }
    }



    const filterAppointments = (status: string) => {
        const now = new Date()

        switch (status) {
            case 'upcoming':
                return appointments.filter(apt =>
                    apt.status === 'scheduled' && new Date(apt.appointmentDate) >= now
                )
            case 'past':
                return appointments.filter(apt =>
                    new Date(apt.appointmentDate) < now || apt.status !== 'scheduled'
                )
            case 'all':
            default:
                return appointments
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                    {userType === 'donor' ? 'My Appointments' : 'Appointment Management'}
                </h2>
                {userType === 'donor' && (
                    <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
                        <DialogTrigger asChild>
                            <Button>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Book Appointment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Book New Appointment</DialogTitle>
                            </DialogHeader>
                            <AppointmentBookingForm
                                onSuccess={() => {
                                    setShowBookingForm(false)
                                    fetchAppointments()
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="space-y-4">
                    <AppointmentList
                        appointments={filterAppointments('upcoming')}
                        onSelect={setSelectedAppointment}
                        userType={userType}
                    />
                </TabsContent>

                <TabsContent value="past" className="space-y-4">
                    <AppointmentList
                        appointments={filterAppointments('past')}
                        onSelect={setSelectedAppointment}
                        userType={userType}
                    />
                </TabsContent>

                <TabsContent value="calendar">
                    <AppointmentCalendar
                        bloodBankId={bloodBankId}
                        onAppointmentSelect={(appointment) => {
                            // Convert the calendar appointment to the management appointment format
                            const managementAppointment: Appointment = {
                                id: appointment.id,
                                appointmentDate: new Date().toISOString(), // This will be set by the calendar
                                status: appointment.status as 'scheduled' | 'completed' | 'cancelled' | 'no_show',
                                notes: appointment.notes,
                                reminderSent: false,
                                createdAt: new Date().toISOString(),
                                bloodBank: {
                                    id: '',
                                    name: appointment.bloodBank.name,
                                    address: appointment.bloodBank.address as {
                                        street: string
                                        city: string
                                        state: string
                                        zipCode: string
                                    },
                                    phone: '',
                                    operatingHours: {}
                                }
                            }
                            setSelectedAppointment(managementAppointment)
                        }}
                    />
                </TabsContent>

                <TabsContent value="all" className="space-y-4">
                    <AppointmentList
                        appointments={filterAppointments('all')}
                        onSelect={setSelectedAppointment}
                        userType={userType}
                    />
                </TabsContent>
            </Tabs>

            {/* Appointment Details Dialog */}
            <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Appointment Details</DialogTitle>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">
                                        {format(new Date(selectedAppointment.appointmentDate), 'PPP')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(selectedAppointment.appointmentDate), 'p')}
                                    </p>
                                </div>
                                <Badge variant={getStatusColor(selectedAppointment.status)}>
                                    {selectedAppointment.status}
                                </Badge>
                            </div>

                            <div>
                                <h4 className="font-medium mb-2">Blood Bank</h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">{selectedAppointment.bloodBank.name}</p>
                                    <div className="flex items-center gap-1">
                                        <MapPinIcon className="h-3 w-3" />
                                        <span>
                                            {selectedAppointment.bloodBank.address.street}, {selectedAppointment.bloodBank.address.city}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <PhoneIcon className="h-3 w-3" />
                                        <span>{selectedAppointment.bloodBank.phone}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedAppointment.notes && (
                                <div>
                                    <h4 className="font-medium mb-2">Notes</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedAppointment.notes}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedAppointment(null)}
                                >
                                    Close
                                </Button>
                                {selectedAppointment.status === 'scheduled' && userType === 'donor' && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => cancelAppointment(selectedAppointment.id)}
                                    >
                                        Cancel Appointment
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

interface AppointmentListProps {
    appointments: Appointment[]
    onSelect: (appointment: Appointment) => void
    userType: 'donor' | 'blood_bank'
}

function AppointmentList({ appointments, onSelect }: AppointmentListProps) {
    if (appointments.length === 0) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">No appointments found</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {appointments.map((appointment) => (
                <Card key={appointment.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4" onClick={() => onSelect(appointment)}>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {format(new Date(appointment.appointmentDate), 'PPP')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {format(new Date(appointment.appointmentDate), 'p')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        {appointment.bloodBank.name}
                                    </span>
                                </div>
                            </div>
                            <Badge variant={getStatusColor(appointment.status)}>
                                {appointment.status}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}