'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { UserManagement } from '@/components/admin'

export default function AdminUsersPage() {
    return (
        <ProtectedRoute requiredRoles={['system_admin']}>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <UserManagement />
                </div>
            </div>
        </ProtectedRoute>
    )
}