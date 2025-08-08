import { ProtectedRoute } from '@/components/auth/protected-route'
import { ProfileForm } from '@/components/auth/profile-form'

export default function ProfilePage() {
    return (
        <ProtectedRoute requiredRoles={['donor', 'admin', 'facility', 'system_admin']}>
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white shadow rounded-lg p-6">
                        <ProfileForm />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}