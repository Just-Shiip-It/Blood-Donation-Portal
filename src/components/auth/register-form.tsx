'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other']

export function RegisterForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'donor'
        }
    })

    const watchedRole = watch('role')

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!result.success) {
                toast.error(result.error?.message || 'Registration failed')
                return
            }

            toast.success('Registration successful! Please check your email to verify your account.')
            router.push('/login')

        } catch (error) {
            console.error('Registration error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                <p className="text-gray-600">Join our blood donation community</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800">Account Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                {...register('email')}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {errors.email && (
                                <p className="text-sm text-red-600">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password *</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                {...register('password')}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-600">{errors.password.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-medium text-gray-700">Account Type *</Label>
                        <select
                            id="role"
                            {...register('role')}
                            disabled={isLoading}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="donor">Blood Donor</option>
                            <option value="facility">Healthcare Facility</option>
                        </select>
                        {errors.role && (
                            <p className="text-sm text-red-600">{errors.role.message}</p>
                        )}
                    </div>
                </div>

                {/* Donor Profile Information */}
                {watchedRole === 'donor' && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="profile.firstName" className="text-sm font-medium text-gray-700">First Name *</Label>
                                <Input
                                    id="profile.firstName"
                                    placeholder="Enter your first name"
                                    {...register('profile.firstName')}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.profile?.firstName && (
                                    <p className="text-sm text-red-600">{errors.profile.firstName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile.lastName" className="text-sm font-medium text-gray-700">Last Name *</Label>
                                <Input
                                    id="profile.lastName"
                                    placeholder="Enter your last name"
                                    {...register('profile.lastName')}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {errors.profile?.lastName && (
                                    <p className="text-sm text-red-600">{errors.profile.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="profile.dateOfBirth">Date of Birth</Label>
                                <Input
                                    id="profile.dateOfBirth"
                                    type="date"
                                    {...register('profile.dateOfBirth')}
                                    disabled={isLoading}
                                />
                                {errors.profile?.dateOfBirth && (
                                    <p className="text-sm text-red-600">{errors.profile.dateOfBirth.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="profile.bloodType">Blood Type</Label>
                                <select
                                    id="profile.bloodType"
                                    {...register('profile.bloodType')}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select blood type</option>
                                    {BLOOD_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                {errors.profile?.bloodType && (
                                    <p className="text-sm text-red-600">{errors.profile.bloodType.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="profile.phone">Phone Number</Label>
                            <Input
                                id="profile.phone"
                                type="tel"
                                placeholder="Enter your phone number"
                                {...register('profile.phone')}
                                disabled={isLoading}
                            />
                            {errors.profile?.phone && (
                                <p className="text-sm text-red-600">{errors.profile.phone.message}</p>
                            )}
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                            <h4 className="text-md font-medium">Address</h4>

                            <div className="space-y-2">
                                <Label htmlFor="profile.address.street">Street Address</Label>
                                <Input
                                    id="profile.address.street"
                                    placeholder="Enter your street address"
                                    {...register('profile.address.street')}
                                    disabled={isLoading}
                                />
                                {errors.profile?.address?.street && (
                                    <p className="text-sm text-red-600">{errors.profile.address.street.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="profile.address.city">City</Label>
                                    <Input
                                        id="profile.address.city"
                                        placeholder="City"
                                        {...register('profile.address.city')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.address?.city && (
                                        <p className="text-sm text-red-600">{errors.profile.address.city.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile.address.state">State</Label>
                                    <Input
                                        id="profile.address.state"
                                        placeholder="State"
                                        {...register('profile.address.state')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.address?.state && (
                                        <p className="text-sm text-red-600">{errors.profile.address.state.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile.address.zipCode">ZIP Code</Label>
                                    <Input
                                        id="profile.address.zipCode"
                                        placeholder="ZIP Code"
                                        {...register('profile.address.zipCode')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.address?.zipCode && (
                                        <p className="text-sm text-red-600">{errors.profile.address.zipCode.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="space-y-4">
                            <h4 className="text-md font-medium">Emergency Contact</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="profile.emergencyContact.name">Contact Name</Label>
                                    <Input
                                        id="profile.emergencyContact.name"
                                        placeholder="Emergency contact name"
                                        {...register('profile.emergencyContact.name')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.emergencyContact?.name && (
                                        <p className="text-sm text-red-600">{errors.profile.emergencyContact.name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile.emergencyContact.relationship">Relationship</Label>
                                    <select
                                        id="profile.emergencyContact.relationship"
                                        {...register('profile.emergencyContact.relationship')}
                                        disabled={isLoading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select relationship</option>
                                        {RELATIONSHIPS.map(rel => (
                                            <option key={rel} value={rel}>{rel}</option>
                                        ))}
                                    </select>
                                    {errors.profile?.emergencyContact?.relationship && (
                                        <p className="text-sm text-red-600">{errors.profile.emergencyContact.relationship.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="profile.emergencyContact.phone">Contact Phone</Label>
                                    <Input
                                        id="profile.emergencyContact.phone"
                                        type="tel"
                                        placeholder="Emergency contact phone"
                                        {...register('profile.emergencyContact.phone')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.emergencyContact?.phone && (
                                        <p className="text-sm text-red-600">{errors.profile.emergencyContact.phone.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="profile.emergencyContact.email">Contact Email (Optional)</Label>
                                    <Input
                                        id="profile.emergencyContact.email"
                                        type="email"
                                        placeholder="Emergency contact email"
                                        {...register('profile.emergencyContact.email')}
                                        disabled={isLoading}
                                    />
                                    {errors.profile?.emergencyContact?.email && (
                                        <p className="text-sm text-red-600">{errors.profile.emergencyContact.email.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Account...
                        </div>
                    ) : (
                        'Create Account'
                    )}
                </Button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <a
                        href="/login"
                        className="font-medium text-blue-600 hover:text-blue-500 underline"
                    >
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    )
}