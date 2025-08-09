import { MultiStepRegistration } from '@/components/donor/multi-step-registration'

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <MultiStepRegistration />
            </div>
        </div>
    )
}