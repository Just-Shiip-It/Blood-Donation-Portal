'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
    registrationStep1Schema,
    registrationStep2Schema,
    registrationStep3Schema,
    type RegistrationStep1,
    type RegistrationStep2,
    type RegistrationStep3,
    type RegistrationStep4
} from '@/lib/validations/donor'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
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

interface MultiStepRegistrationProps {
    onComplete?: () => void
}

export function MultiStepRegistration({ onComplete }: MultiStepRegistrationProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [registrationData, setRegistrationData] = useState<{
        step1?: RegistrationStep1
        step2?: RegistrationStep2
        step3?: RegistrationStep3
        step4?: RegistrationStep4
    }>({})

    const router = useRouter()

    const totalSteps = 4

    const getStepTitle = (step: number) => {
        switch (step) {
            case 1: return 'Account Setup'
            case 2: return 'Personal Information'
            case 3: return 'Contact Details'
            case 4: return 'Medical History & Preferences'
            default: return 'Registration'
        }
    }

    const handleStepComplete = (stepData: Record<string, unknown>, step: number) => {
        setRegistrationData(prev => ({
            ...prev,
            [`step${step}`]: stepData
        }))

        if (step < totalSteps) {
            setCurrentStep(step + 1)
        } else {
            handleFinalSubmit()
        }
    }

    const handleFinalSubmit = async () => {
        setIsLoading(true)

        try {
            const completeData = {
                email: registrationData.step1!.email,
                password: registrationData.step1!.password,
                role: 'donor' as const,
                profile: {
                    ...registrationData.step2!,
                    ...registrationData.step3!,
                    ...registrationData.step4!
                }
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(completeData)
            })

            const result = await response.json()

            if (!result.success) {
                toast.error(result.error?.message || 'Registration failed')
                return
            }

            toast.success('Registration successful! Please check your email to verify your account.')

            if (onComplete) {
                onComplete()
            } else {
                router.push('/login')
            }

        } catch (error) {
            console.error('Registration error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const goToPreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
            {/* Progress indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Donor Registration</h2>
                    <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                    />
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mt-4">{getStepTitle(currentStep)}</h3>
            </div>

            {/* Step content */}
            {currentStep === 1 && (
                <Step1Form
                    onNext={(data) => handleStepComplete(data, 1)}
                    initialData={registrationData.step1}
                    isLoading={isLoading}
                />
            )}

            {currentStep === 2 && (
                <Step2Form
                    onNext={(data) => handleStepComplete(data, 2)}
                    onPrevious={goToPreviousStep}
                    initialData={registrationData.step2}
                    isLoading={isLoading}
                />
            )}

            {currentStep === 3 && (
                <Step3Form
                    onNext={(data) => handleStepComplete(data, 3)}
                    onPrevious={goToPreviousStep}
                    initialData={registrationData.step3}
                    isLoading={isLoading}
                />
            )}

            {currentStep === 4 && (
                <Step4Form
                    onNext={(data) => handleStepComplete(data, 4)}
                    onPrevious={goToPreviousStep}
                    initialData={registrationData.step4}
                    isLoading={isLoading}
                />
            )}
        </div>
    )
}

// Step 1: Account Setup
function Step1Form({ onNext, initialData, isLoading }: {
    onNext: (data: RegistrationStep1) => void
    initialData?: RegistrationStep1
    isLoading: boolean
}) {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<RegistrationStep1>({
        resolver: zodResolver(registrationStep1Schema),
        defaultValues: initialData
    })

    return (
        <form onSubmit={handleSubmit(onNext)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        {...register('email')}
                        disabled={isLoading}
                    />
                    {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Create a secure password"
                        {...register('password')}
                        disabled={isLoading}
                    />
                    {errors.password && (
                        <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                        Password must be at least 8 characters with uppercase, lowercase, and number
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        {...register('confirmPassword')}
                        disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    Next: Personal Information
                </Button>
            </div>
        </form>
    )
}

// Step 2: Personal Information
function Step2Form({ onNext, onPrevious, initialData, isLoading }: {
    onNext: (data: RegistrationStep2) => void
    onPrevious: () => void
    initialData?: RegistrationStep2
    isLoading: boolean
}) {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<RegistrationStep2>({
        resolver: zodResolver(registrationStep2Schema),
        defaultValues: initialData
    })

    return (
        <form onSubmit={handleSubmit(onNext)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
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
                    <Label htmlFor="lastName">Last Name *</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                        id="dateOfBirth"
                        type="date"
                        {...register('dateOfBirth')}
                        disabled={isLoading}
                    />
                    {errors.dateOfBirth && (
                        <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>
                    )}
                    <p className="text-xs text-gray-500">Must be between 16 and 100 years old</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bloodType">Blood Type *</Label>
                    <select
                        id="bloodType"
                        {...register('bloodType')}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select your blood type</option>
                        {BLOOD_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    {errors.bloodType && (
                        <p className="text-sm text-red-600">{errors.bloodType.message}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
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

            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onPrevious} disabled={isLoading}>
                    Previous
                </Button>
                <Button type="submit" disabled={isLoading}>
                    Next: Contact Details
                </Button>
            </div>
        </form>
    )
}

// Step 3: Contact Details
function Step3Form({ onNext, onPrevious, initialData, isLoading }: {
    onNext: (data: RegistrationStep3) => void
    onPrevious: () => void
    initialData?: RegistrationStep3
    isLoading: boolean
}) {
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<RegistrationStep3>({
        resolver: zodResolver(registrationStep3Schema),
        defaultValues: initialData
    })

    return (
        <form onSubmit={handleSubmit(onNext)} className="space-y-6">
            {/* Address Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium">Address Information</h4>

                <div className="space-y-2">
                    <Label htmlFor="address.street">Street Address *</Label>
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
                        <Label htmlFor="address.city">City *</Label>
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
                        <Label htmlFor="address.state">State *</Label>
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
                        <Label htmlFor="address.zipCode">ZIP Code *</Label>
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

                <div className="space-y-2">
                    <Label htmlFor="address.country">Country</Label>
                    <Input
                        id="address.country"
                        placeholder="Country (optional)"
                        {...register('address.country')}
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium">Emergency Contact</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="emergencyContact.name">Contact Name *</Label>
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
                        <Label htmlFor="emergencyContact.relationship">Relationship *</Label>
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
                    <Label htmlFor="emergencyContact.phone">Contact Phone *</Label>
                    <Input
                        id="emergencyContact.phone"
                        type="tel"
                        placeholder="Emergency contact phone number"
                        {...register('emergencyContact.phone')}
                        disabled={isLoading}
                    />
                    {errors.emergencyContact?.phone && (
                        <p className="text-sm text-red-600">{errors.emergencyContact.phone.message}</p>
                    )}
                </div>
            </div>

            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onPrevious} disabled={isLoading}>
                    Previous
                </Button>
                <Button type="submit" disabled={isLoading}>
                    Next: Medical History
                </Button>
            </div>
        </form>
    )
}

// Step 4: Medical History & Preferences
function Step4Form({ onNext, onPrevious, initialData, isLoading }: {
    onNext: (data: RegistrationStep4) => void
    onPrevious: () => void
    initialData?: RegistrationStep4
    isLoading: boolean
}) {
    const {
        register,
        handleSubmit,
        watch
    } = useForm<RegistrationStep4>({
        // resolver: zodResolver(registrationStep4Schema),
        defaultValues: {
            medicalHistory: {
                hasChronicConditions: false,
                lifestyle: {
                    smoker: false,
                    alcoholConsumption: 'none',
                    recentTattoos: false,
                    recentPiercings: false
                },
                pregnancies: {
                    hasBeenPregnant: false
                }
            },
            preferences: {
                notifications: {
                    email: true,
                    sms: false,
                    push: true
                },
                scheduling: {
                    preferredDays: [],
                    preferredTimes: [],
                    maxTravelDistance: 25
                },
                privacy: {
                    shareDataForResearch: false,
                    allowPublicRecognition: false
                }
            },
            ...initialData
        }
    })

    const hasChronicConditions = watch('medicalHistory.hasChronicConditions')

    return (
        <form onSubmit={handleSubmit(onNext)} className="space-y-6">
            {/* Medical History Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium">Medical History</h4>

                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="medicalHistory.hasChronicConditions"
                            {...register('medicalHistory.hasChronicConditions')}
                            disabled={isLoading}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="medicalHistory.hasChronicConditions">
                            I have chronic medical conditions
                        </Label>
                    </div>

                    {hasChronicConditions && (
                        <div className="space-y-2">
                            <Label htmlFor="chronicConditionsText">Please describe your chronic conditions</Label>
                            <Textarea
                                id="chronicConditionsText"
                                placeholder="List any chronic medical conditions, medications, or ongoing treatments..."
                                disabled={isLoading}
                                className="min-h-[100px]"
                            />
                            <p className="text-xs text-gray-500">
                                This information helps us ensure your safety and eligibility for donation
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="allergiesText">Allergies (if any)</Label>
                        <Input
                            id="allergiesText"
                            placeholder="List any known allergies (optional)"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="medicalHistory.lifestyle.smoker"
                                {...register('medicalHistory.lifestyle.smoker')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="medicalHistory.lifestyle.smoker">I am a smoker</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="medicalHistory.lifestyle.recentTattoos"
                                {...register('medicalHistory.lifestyle.recentTattoos')}
                                disabled={isLoading}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="medicalHistory.lifestyle.recentTattoos">
                                Recent tattoo/piercing (last 3 months)
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium">Notification Preferences</h4>

                <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="preferences.notifications.email"
                            {...register('preferences.notifications.email')}
                            disabled={isLoading}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            defaultChecked
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
                            defaultChecked
                        />
                        <Label htmlFor="preferences.notifications.push">Push notifications</Label>
                    </div>
                </div>
            </div>

            {/* Scheduling Preferences */}
            <div className="space-y-4">
                <h4 className="text-lg font-medium">Scheduling Preferences (Optional)</h4>

                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                    <div className="space-y-2">
                        <Label>Preferred days of the week</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {DAYS_OF_WEEK.map(day => (
                                <div key={day.value} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`preferences.scheduling.preferredDays.${day.value}`}
                                        value={day.value}
                                        {...register('preferences.scheduling.preferredDays')}
                                        disabled={isLoading}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor={`preferences.scheduling.preferredDays.${day.value}`} className="text-sm">
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
                                        id={`preferences.scheduling.preferredTimes.${time.value}`}
                                        value={time.value}
                                        {...register('preferences.scheduling.preferredTimes')}
                                        disabled={isLoading}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor={`preferences.scheduling.preferredTimes.${time.value}`} className="text-sm">
                                        {time.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="preferences.scheduling.maxTravelDistance">
                            Maximum travel distance (miles)
                        </Label>
                        <Input
                            id="preferences.scheduling.maxTravelDistance"
                            type="number"
                            min="1"
                            max="100"
                            placeholder="25"
                            {...register('preferences.scheduling.maxTravelDistance', { valueAsNumber: true })}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={onPrevious} disabled={isLoading}>
                    Previous
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Account...
                        </div>
                    ) : (
                        'Complete Registration'
                    )}
                </Button>
            </div>
        </form>
    )
}