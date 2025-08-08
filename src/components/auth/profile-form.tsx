'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ProfileData {
    user: {
        id: string
        email: string
        role: string
        emailVerified: boolean
        isActive: boolean
    }
    profile?: {
        firstName: string
        lastName: string
        phone: string
        address: {
            street: string
            city: string
            state: string
            zipCode: string
            country: string
        }
        emergencyContact: {
            name: string
            relationship: string
            phone: string
            email?: string
        }
        preferences?: {
            notifications?: {
                email: boolean
                sms: boolean
                push: boolean
            }
            scheduling?: {
                preferredDays?: string[]
                preferredTimes?: string[]
            }
        }
    }
}

const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other']
// const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
// const TIMES = ['morning', 'afternoon', 'evening']

export function ProfileForm() {
    const [isLoading, setIsLoading] = useState(false)
    const [profileData, setProfileData] = useState<ProfileData | null>(null)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty }
    } = useForm<UpdateProfileInput>({
        resolver: zodResolver(updateProfileSchema)
    })

    // Load profile data on component mount
    useEffect(() => {
        loadProfile()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const loadProfile = async () => {
        try {
            const response = await fetch('/api/auth/profile')
            const result = await response.json()

            if (result.success && result.data) {
                setProfileData(result.data)

                // Populate form with existing data
                if (result.data.profile) {
                    reset({
                        firstName: result.data.profile.firstName,
                        lastName: result.data.profile.lastName,
                        phone: result.data.profile.phone,
                        address: result.data.profile.address,
                        emergencyContact: result.data.profile.emergencyContact,
                        preferences: result.data.profile.preferences
                    })
                }
            } else {
                toast.error('Failed to load profile data')
            }
        } catch (error) {
            console.error('Load profile error:', error)
            toast.error('Failed to load profile data')
        } finally {
            setIsLoadingProfile(false)
        }
    }

    const onSubmit = async (data: UpdateProfileInput) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!result.success) {
                toast.error(result.error?.message || 'Failed to update profile')
                return
            }

            toast.success('Profile updated successfully!')
            await loadProfile() // Reload profile data

        } catch (error) {
            console.error('Update profile error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoadingProfile) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (!profileData) {
        return (
            <div className="text-center p-8">
                <p className="text-gray-600">Failed to load profile data</p>
                <Button onClick={loadProfile} className="mt-4">
                    Retry
                </Button>
            </div>
        )
    }

    // Only show profile form for donors
    if (profileData.user.role !== 'donor') {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Email:</strong> {profileData.user.email}</p>
                    <p><strong>Role:</strong> {profileData.user.role}</p>
                    <p><strong>Status:</strong> {profileData.user.isActive ? 'Active' : 'Inactive'}</p>
                    <p><strong>Email Verified:</strong> {profileData.user.emailVerified ? 'Yes' : 'No'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Profile Settings</h2>
                <p className="text-gray-600">Update your personal information and preferences</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Personal Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                placeholder="Enter your first name"
                                {...register('firstName')}
                                disabled={isLoading}
                            />
                            {errors.firstName && (
                                <p className="text-sm text-red-600">{errors.firstName.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                placeholder="Enter your last name"
                                {...register('lastName')}
                                disabled={isLoading}
                            />
                            {errors.lastName && (
                                <p className="text-sm text-red-600">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter your phone number"
                            {...register('phone')}
                            disabled={isLoading}
                        />
                        {errors.phone && (
                            <p className="text-sm text-red-600">{errors.phone.message}</p>
                        )}
                    </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Address</h3>

                    <div className="space-y-2">
                        <Label htmlFor="address.street">Street Address</Label>
                        <Input
                            id="address.street"
                            placeholder="Enter your street address"
                            {...register('address.street')}
                            disabled={isLoading}
                        />
                        {errors.address?.street && (
                            <p className="text-sm text-red-600">{errors.address.street.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="address.city">City</Label>
                            <Input
                                id="address.city"
                                placeholder="City"
                                {...register('address.city')}
                                disabled={isLoading}
                            />
                            {errors.address?.city && (
                                <p className="text-sm text-red-600">{errors.address.city.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address.state">State</Label>
                            <Input
                                id="address.state"
                                placeholder="State"
                                {...register('address.state')}
                                disabled={isLoading}
                            />
                            {errors.address?.state && (
                                <p className="text-sm text-red-600">{errors.address.state.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address.zipCode">ZIP Code</Label>
                            <Input
                                id="address.zipCode"
                                placeholder="ZIP Code"
                                {...register('address.zipCode')}
                                disabled={isLoading}
                            />
                            {errors.address?.zipCode && (
                                <p className="text-sm text-red-600">{errors.address.zipCode.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Emergency Contact</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact.name">Contact Name</Label>
                            <Input
                                id="emergencyContact.name"
                                placeholder="Emergency contact name"
                                {...register('emergencyContact.name')}
                                disabled={isLoading}
                            />
                            {errors.emergencyContact?.name && (
                                <p className="text-sm text-red-600">{errors.emergencyContact.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact.relationship">Relationship</Label>
                            <select
                                id="emergencyContact.relationship"
                                {...register('emergencyContact.relationship')}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select relationship</option>
                                {RELATIONSHIPS.map(rel => (
                                    <option key={rel} value={rel}>{rel}</option>
                                ))}
                            </select>
                            {errors.emergencyContact?.relationship && (
                                <p className="text-sm text-red-600">{errors.emergencyContact.relationship.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact.phone">Contact Phone</Label>
                            <Input
                                id="emergencyContact.phone"
                                type="tel"
                                placeholder="Emergency contact phone"
                                {...register('emergencyContact.phone')}
                                disabled={isLoading}
                            />
                            {errors.emergencyContact?.phone && (
                                <p className="text-sm text-red-600">{errors.emergencyContact.phone.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact.email">Contact Email (Optional)</Label>
                            <Input
                                id="emergencyContact.email"
                                type="email"
                                placeholder="Emergency contact email"
                                {...register('emergencyContact.email')}
                                disabled={isLoading}
                            />
                            {errors.emergencyContact?.email && (
                                <p className="text-sm text-red-600">{errors.emergencyContact.email.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Notification Preferences</h3>

                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="preferences.notifications.email"
                                {...register('preferences.notifications.email')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="preferences.notifications.email">Email notifications</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="preferences.notifications.sms"
                                {...register('preferences.notifications.sms')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="preferences.notifications.sms">SMS notifications</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="preferences.notifications.push"
                                {...register('preferences.notifications.push')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="preferences.notifications.push">Push notifications</Label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => reset()}
                        disabled={isLoading || !isDirty}
                    >
                        Reset Changes
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading || !isDirty}
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    )
}