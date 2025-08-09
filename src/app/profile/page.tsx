import { ProtectedRoute } from '@/components/auth/protected-route'
import { DonorProfileManager } from '@/components/donor/donor-profile-manager'

export default function ProfilePage() {
    return (
        <ProtectedRoute requiredRoles={['donor', 'admin', 'facility', 'system_admin']}>
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <DonorProfileManager />
                </div>
            </div>
        </ProtectedRoute>
    )
}