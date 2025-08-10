import { AppointmentManagement } from '@/components/appointments'

export default function AppointmentsPage() {
    return (
        <div className="container mx-auto py-8">
            <AppointmentManagement userType="donor" />
        </div>
    )
}