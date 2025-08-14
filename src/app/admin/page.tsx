'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { SystemAdminDashboard, BloodBankAdminDashboard } from '@/components/admin'
import { AlertTriangle } from 'lucide-react'

export default function AdminPage() {
    return (
        <ProtectedRoute requiredRoles={['admin', 'system_admin']}>
            <AdminContent />
        </ProtectedRoute>
    )
}

function AdminContent() {
    // For now, show system admin dashboard by default
    // In a real implementation, this would check user role from auth context
    const userRole = 'system_admin' // This should come from auth context

    // Show different dashboards based on user role
    if (userRole === 'system_admin') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <SystemAdminDashboard />
                </div>
            </div>
        )
    }

    if (userRole === 'admin') {
        // For blood bank admins, we need to get their blood bank ID
        // This would typically come from their profile or be determined by their association
        const bloodBankId = 'default-blood-bank-id' // This should be properly determined

        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <BloodBankAdminDashboard bloodBankId={bloodBankId} />
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Role</h3>
                <p className="text-gray-600">Your role is not configured for admin access.</p>
            </div>
        </div>
    )
}