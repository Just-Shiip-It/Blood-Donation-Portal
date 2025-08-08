import { ProtectedRoute } from '@/components/auth/protected-route'

function DashboardContent() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            Welcome to your Dashboard
                        </h1>
                        <p className="text-gray-600 mb-6">
                            This is your blood donation portal dashboard. Here you can manage your profile,
                            schedule appointments, and track your donation history.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile</h3>
                                <p className="text-gray-600 mb-4">Manage your personal information and preferences</p>
                                <a
                                    href="/profile"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    View Profile
                                </a>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointments</h3>
                                <p className="text-gray-600 mb-4">Schedule and manage your donation appointments</p>
                                <a
                                    href="/appointments"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                    View Appointments
                                </a>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Donation History</h3>
                                <p className="text-gray-600 mb-4">Track your past donations and impact</p>
                                <a
                                    href="/donations"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                >
                                    View History
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <ProtectedRoute requiredRoles={['donor', 'admin', 'facility', 'system_admin']}>
            <DashboardContent />
        </ProtectedRoute>
    )
}