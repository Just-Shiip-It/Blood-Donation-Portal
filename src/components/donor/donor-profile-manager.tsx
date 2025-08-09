'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    updatePreferencesSchema,
    type UpdateDonorProfile,
    type UpdateMedicalHistory,
    type UpdatePreferences,
    type DonorProfile
} from '@/lib/validations/donor'
import { DonorEligibilityService } from '@/lib/services/eligibility'


const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other']
const DAYS_OF_WEEK = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
]
const TIMES_OF_DAY = [
    { value: 'morning', label: 'Morning (8AM - 12PM)' },
    { value: 'afternoon', label: 'Afternoon (12PM - 5PM)' },
    { value: 'evening', label: 'Evening (5PM - 8PM)' }
]

interface DonorProfileData {
    user: {
        id: string
        email: string
        role: string
        emailVerified: boolean
        isActive: boolean
    }
    profile: DonorProfile & {
        id: string
        userId: string
        lastDonationDate?: string
        totalDonations: number
        isDeferredTemporary: boolean
        isDeferredPermanent: boolean
        deferralReason?: string
        deferralEndDate?: string
        createdAt: string
        updatedAt: string
    }
}

export function DonorProfileManager() {
    const [profileData, setProfileData] = useState<DonorProfileData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingProfile, setIsLoadingProfile] = useState(true)
    const [eligibilityStatus, setEligibilityStatus] = useState<{
        status: 'eligible' | 'temporarily_deferred' | 'permanently_deferred'
        message: string
        nextEligibleDate?: Date
    } | null>(null)

    // Load profile data on component mount
    useEffect(() => {
        loadProfile()
    }, [])

    // Update eligibility when profile data changes
    useEffect(() => {
        if (profileData?.profile) {
            const eligibility = DonorEligibilityService.getEligibilitySummary(
                profileData.profile,
                profileData.profile.lastDonationDate
            )
            setEligibilityStatus(eligibility)
        }
    }, [profileData])

    const loadProfile = async () => {
        try {
            const response = await fetch('/api/donors/profile')
            const result = await response.json()

            if (result.success && result.data) {
                setProfileData(result.data)
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

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Profile Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">
                                {profileData.profile.firstName} {profileData.profile.lastName}
                            </CardTitle>
                            <CardDescription>
                                Blood Type: {profileData.profile.bloodType} • Total Donations: {profileData.profile.totalDonations}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            {eligibilityStatus && (
                                <Badge
                                    variant={
                                        eligibilityStatus.status === 'eligible' ? 'default' :
                                            eligibilityStatus.status === 'temporarily_deferred' ? 'secondary' : 'destructive'
                                    }
                                    className="mb-2"
                                >
                                    {eligibilityStatus.status === 'eligible' ? 'Eligible to Donate' :
                                        eligibilityStatus.status === 'temporarily_deferred' ? 'Temporarily Deferred' : 'Permanently Deferred'}
                                </Badge>
                            )}
                            <p className="text-sm text-gray-600">
                                {eligibilityStatus?.message}
                            </p>
                            {eligibilityStatus?.nextEligibleDate && (
                                <p className="text-xs text-gray-500">
                                    Next eligible: {eligibilityStatus.nextEligibleDate.toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Profile Management Tabs */}
            <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="medical">Medical History</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                </TabsList>

                <TabsContent value="personal">
                    <PersonalInfoTab
                        profileData={profileData}
                        onUpdate={loadProfile}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                    />
                </TabsContent>

                <TabsContent value="medical">
                    <MedicalHistoryTab
                        profileData={profileData}
                        onUpdate={loadProfile}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                    />
                </TabsContent>

                <TabsContent value="preferences">
                    <PreferencesTab
                        profileData={profileData}
                        onUpdate={loadProfile}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                    />
                </TabsContent>

                <TabsContent value="eligibility">
                    <EligibilityTab
                        profileData={profileData}
                        eligibilityStatus={eligibilityStatus}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// Personal Information Tab
function PersonalInfoTab({ profileData, onUpdate, isLoading, setIsLoading }: {
    profileData: DonorProfileData
    onUpdate: () => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}) {
    const {
        register,
        handleSubmit,
        formState: { errors, isDirty }
    } = useForm<UpdateDonorProfile>({
        // resolver: zodResolver(updateDonorProfileSchema),
        defaultValues: {
            firstName: profileData.profile.firstName,
            lastName: profileData.profile.lastName,
            phone: profileData.profile.phone,
            address: profileData.profile.address,
            emergencyContact: profileData.profile.emergencyContact
        }
    })

    const onSubmit = async (data: UpdateDonorProfile) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/donors/profile', {
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
            onUpdate()

        } catch (error) {
            console.error('Update profile error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
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
                            {...register('phone')}
                            disabled={isLoading}
                        />
                        {errors.phone && (
                            <p className="text-sm text-red-600">{errors.phone.message}</p>
                        )}
                    </div>

                    {/* Address Information */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium">Address</h4>

                        <div className="space-y-2">
                            <Label htmlFor="address.street">Street Address</Label>
                            <Input
                                id="address.street"
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
                        <h4 className="text-lg font-medium">Emergency Contact</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emergencyContact.name">Contact Name</Label>
                                <Input
                                    id="emergencyContact.name"
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

                        <div className="space-y-2">
                            <Label htmlFor="emergencyContact.phone">Contact Phone</Label>
                            <Input
                                id="emergencyContact.phone"
                                type="tel"
                                {...register('emergencyContact.phone')}
                                disabled={isLoading}
                            />
                            {errors.emergencyContact?.phone && (
                                <p className="text-sm text-red-600">{errors.emergencyContact.phone.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading || !isDirty}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

// Medical History Tab
function MedicalHistoryTab({ profileData, onUpdate, isLoading, setIsLoading }: {
    profileData: DonorProfileData
    onUpdate: () => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { isDirty }
    } = useForm<UpdateMedicalHistory>({
        // resolver: zodResolver(updateMedicalHistorySchema),
        defaultValues: {
            hasChronicConditions: false,
            lifestyle: {
                smoker: false,
                alcoholConsumption: 'none',
                recentTattoos: false,
                recentPiercings: false
            },
            pregnancies: {
                hasBeenPregnant: false
            },
            ...profileData.profile.medicalHistory
        }
    })

    const hasChronicConditions = watch('hasChronicConditions')

    const onSubmit = async (data: UpdateMedicalHistory) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/donors/medical-history', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!result.success) {
                toast.error(result.error?.message || 'Failed to update medical history')
                return
            }

            toast.success('Medical history updated successfully!')
            onUpdate()

        } catch (error) {
            console.error('Update medical history error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Medical History</CardTitle>
                <CardDescription>Keep your medical information up to date for safety and eligibility</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="hasChronicConditions"
                                {...register('hasChronicConditions')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="hasChronicConditions">I have chronic medical conditions</Label>
                        </div>

                        {hasChronicConditions && (
                            <div className="space-y-2 p-4 bg-yellow-50 rounded-lg">
                                <Label>Please describe your chronic conditions</Label>
                                <Textarea
                                    placeholder="List any chronic medical conditions, medications, or ongoing treatments..."
                                    disabled={isLoading}
                                    className="min-h-[100px]"
                                />
                                <p className="text-xs text-gray-500">
                                    This information helps us ensure your safety and eligibility for donation
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="lifestyle.smoker"
                                    {...register('lifestyle.smoker')}
                                    disabled={isLoading}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="lifestyle.smoker">I am a smoker</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="lifestyle.recentTattoos"
                                    {...register('lifestyle.recentTattoos')}
                                    disabled={isLoading}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="lifestyle.recentTattoos">Recent tattoo/piercing (last 3 months)</Label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lifestyle.alcoholConsumption">Alcohol consumption</Label>
                            <select
                                id="lifestyle.alcoholConsumption"
                                {...register('lifestyle.alcoholConsumption')}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="none">None</option>
                                <option value="occasional">Occasional</option>
                                <option value="moderate">Moderate</option>
                                <option value="heavy">Heavy</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading || !isDirty}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

// Preferences Tab
function PreferencesTab({ profileData, onUpdate, isLoading, setIsLoading }: {
    profileData: DonorProfileData
    onUpdate: () => void
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}) {
    const {
        register,
        handleSubmit,
        formState: { isDirty }
    } = useForm<UpdatePreferences>({
        resolver: zodResolver(updatePreferencesSchema),
        defaultValues: profileData.profile.preferences || {}
    })

    const onSubmit = async (data: UpdatePreferences) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/donors/preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!result.success) {
                toast.error(result.error?.message || 'Failed to update preferences')
                return
            }

            toast.success('Preferences updated successfully!')
            onUpdate()

        } catch (error) {
            console.error('Update preferences error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your notification and scheduling preferences</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Notification Preferences */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium">Notifications</h4>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="notifications.email"
                                    {...register('notifications.email')}
                                    disabled={isLoading}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="notifications.email">Email notifications</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="notifications.sms"
                                    {...register('notifications.sms')}
                                    disabled={isLoading}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="notifications.sms">SMS notifications</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="notifications.push"
                                    {...register('notifications.push')}
                                    disabled={isLoading}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="notifications.push">Push notifications</Label>
                            </div>
                        </div>
                    </div>

                    {/* Scheduling Preferences */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium">Scheduling</h4>

                        <div className="space-y-2">
                            <Label>Preferred days of the week</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`scheduling.preferredDays.${day.value}`}
                                            value={day.value}
                                            {...register('scheduling.preferredDays')}
                                            disabled={isLoading}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label htmlFor={`scheduling.preferredDays.${day.value}`} className="text-sm">
                                            {day.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Preferred times of day</Label>
                            <div className="space-y-2">
                                {TIMES_OF_DAY.map(time => (
                                    <div key={time.value} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`scheduling.preferredTimes.${time.value}`}
                                            value={time.value}
                                            {...register('scheduling.preferredTimes')}
                                            disabled={isLoading}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <Label htmlFor={`scheduling.preferredTimes.${time.value}`} className="text-sm">
                                            {time.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="scheduling.maxTravelDistance">Maximum travel distance (miles)</Label>
                            <Input
                                id="scheduling.maxTravelDistance"
                                type="number"
                                min="1"
                                max="100"
                                {...register('scheduling.maxTravelDistance', { valueAsNumber: true })}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading || !isDirty}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

// Eligibility Tab
function EligibilityTab({ profileData, eligibilityStatus }: {
    profileData: DonorProfileData
    eligibilityStatus: {
        status: 'eligible' | 'temporarily_deferred' | 'permanently_deferred'
        message: string
        nextEligibleDate?: Date
    } | null
}) {
    const eligibilityResult = DonorEligibilityService.checkEligibility(
        profileData.profile,
        profileData.profile.lastDonationDate
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>Donation Eligibility</CardTitle>
                <CardDescription>Your current eligibility status and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Current Status */}
                <div className="p-4 rounded-lg border-2 border-dashed">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-medium">Current Status</h4>
                        <Badge
                            variant={
                                eligibilityStatus?.status === 'eligible' ? 'default' :
                                    eligibilityStatus?.status === 'temporarily_deferred' ? 'secondary' : 'destructive'
                            }
                        >
                            {eligibilityStatus?.status === 'eligible' ? 'Eligible' :
                                eligibilityStatus?.status === 'temporarily_deferred' ? 'Temporarily Deferred' : 'Permanently Deferred'}
                        </Badge>
                    </div>
                    <p className="text-gray-600">{eligibilityStatus?.message}</p>
                    {eligibilityStatus?.nextEligibleDate && (
                        <p className="text-sm text-gray-500 mt-2">
                            Next eligible date: {eligibilityStatus.nextEligibleDate.toLocaleDateString()}
                        </p>
                    )}
                </div>

                {/* Eligibility Details */}
                {!eligibilityResult.isEligible && (
                    <div className="space-y-4">
                        {eligibilityResult.reasons.length > 0 && (
                            <div>
                                <h4 className="text-lg font-medium mb-2">Eligibility Issues</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {eligibilityResult.reasons.map((reason, index) => (
                                        <li key={index} className="text-red-600">{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {eligibilityResult.temporaryDeferrals.length > 0 && (
                            <div>
                                <h4 className="text-lg font-medium mb-2">Temporary Deferrals</h4>
                                <div className="space-y-2">
                                    {eligibilityResult.temporaryDeferrals.map((deferral, index) => (
                                        <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                                            <p className="font-medium text-yellow-800">{deferral.reason}</p>
                                            <p className="text-sm text-yellow-600">
                                                Until: {deferral.until.toLocaleDateString()}
                                            </p>
                                            {deferral.notes && (
                                                <p className="text-xs text-yellow-600 mt-1">{deferral.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {eligibilityResult.permanentDeferrals.length > 0 && (
                            <div>
                                <h4 className="text-lg font-medium mb-2">Permanent Deferrals</h4>
                                <div className="space-y-2">
                                    {eligibilityResult.permanentDeferrals.map((deferral, index) => (
                                        <div key={index} className="p-3 bg-red-50 rounded-lg">
                                            <p className="font-medium text-red-800">{deferral.reason}</p>
                                            {deferral.notes && (
                                                <p className="text-xs text-red-600 mt-1">{deferral.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Donation History Summary */}
                <div>
                    <h4 className="text-lg font-medium mb-2">Donation Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-600">{profileData.profile.totalDonations}</p>
                            <p className="text-sm text-blue-600">Total Donations</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-green-600">
                                {profileData.profile.lastDonationDate
                                    ? new Date(profileData.profile.lastDonationDate).toLocaleDateString()
                                    : 'Never'
                                }
                            </p>
                            <p className="text-sm text-green-600">Last Donation</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg text-center">
                            <p className="text-lg font-bold text-purple-600">
                                {profileData.profile.lastDonationDate
                                    ? DonorEligibilityService.getNextEligibleDate(profileData.profile.lastDonationDate).toLocaleDateString()
                                    : 'Now'
                                }
                            </p>
                            <p className="text-sm text-purple-600">Next Eligible</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}