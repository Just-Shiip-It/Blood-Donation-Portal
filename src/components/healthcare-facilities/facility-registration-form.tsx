'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { healthcareFacilityRegistrationSchema, type HealthcareFacilityRegistrationInput } from '@/lib/validations/healthcare-facility'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle, Building2, MapPin, Phone, Mail, FileText } from 'lucide-react'

interface FacilityRegistrationFormProps {
    onSubmit: (data: HealthcareFacilityRegistrationInput) => Promise<void>
    isLoading?: boolean
    initialData?: Partial<HealthcareFacilityRegistrationInput>
}

const facilityTypes = [
    { value: 'hospital', label: 'Hospital', description: 'Full-service medical facility' },
    { value: 'clinic', label: 'Clinic', description: 'Outpatient medical facility' },
    { value: 'emergency', label: 'Emergency Center', description: 'Emergency medical services' }
] as const

export function FacilityRegistrationForm({ onSubmit, isLoading = false, initialData }: FacilityRegistrationFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting }
    } = useForm<HealthcareFacilityRegistrationInput>({
        resolver: zodResolver(healthcareFacilityRegistrationSchema),
        defaultValues: {
            name: initialData?.name || '',
            address: initialData?.address || {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'United States'
            },
            phone: initialData?.phone || '',
            email: initialData?.email || '',
            licenseNumber: initialData?.licenseNumber || '',
            facilityType: initialData?.facilityType,
            coordinates: initialData?.coordinates
        }
    })

    const handleFormSubmit = async (data: HealthcareFacilityRegistrationInput) => {
        try {
            setSubmitError(null)
            setSubmitSuccess(false)
            await onSubmit(data)
            setSubmitSuccess(true)
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to register healthcare facility')
        }
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    Healthcare Facility Registration
                </CardTitle>
                <CardDescription>
                    Register your healthcare facility to request blood units and manage patient needs.
                    All fields marked with * are required.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">Basic Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Facility Name *</Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="Enter facility name"
                                    maxLength={200}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="facilityType">Facility Type *</Label>
                                <Select
                                    onValueChange={(value) => setValue('facilityType', value as typeof facilityTypes[number]['value'])}
                                    defaultValue={initialData?.facilityType}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select facility type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {facilityTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{type.label}</span>
                                                    <span className="text-sm text-gray-500">{type.description}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.facilityType && (
                                    <p className="text-sm text-red-600">{errors.facilityType.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="licenseNumber">License Number *</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="licenseNumber"
                                        {...register('licenseNumber')}
                                        placeholder="Enter license number"
                                        maxLength={100}
                                        className="pl-10"
                                    />
                                </div>
                                {errors.licenseNumber && (
                                    <p className="text-sm text-red-600">{errors.licenseNumber.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <Phone className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">Contact Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        {...register('phone')}
                                        placeholder="(555) 123-4567"
                                        maxLength={20}
                                        className="pl-10"
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register('email')}
                                        placeholder="admin@facility.com"
                                        maxLength={255}
                                        className="pl-10"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">Address Information</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="street">Street Address *</Label>
                                <Input
                                    id="street"
                                    {...register('address.street')}
                                    placeholder="123 Main Street"
                                />
                                {errors.address?.street && (
                                    <p className="text-sm text-red-600">{errors.address.street.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="city">City *</Label>
                                    <Input
                                        id="city"
                                        {...register('address.city')}
                                        placeholder="New York"
                                    />
                                    {errors.address?.city && (
                                        <p className="text-sm text-red-600">{errors.address.city.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="state">State *</Label>
                                    <Input
                                        id="state"
                                        {...register('address.state')}
                                        placeholder="NY"
                                        maxLength={2}
                                    />
                                    {errors.address?.state && (
                                        <p className="text-sm text-red-600">{errors.address.state.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="zipCode">ZIP Code *</Label>
                                    <Input
                                        id="zipCode"
                                        {...register('address.zipCode')}
                                        placeholder="10001"
                                        maxLength={10}
                                    />
                                    {errors.address?.zipCode && (
                                        <p className="text-sm text-red-600">{errors.address.zipCode.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    {...register('address.country')}
                                    placeholder="United States"
                                />
                                {errors.address?.country && (
                                    <p className="text-sm text-red-600">{errors.address.country.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location Coordinates (Optional) */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">Location Coordinates (Optional)</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Providing coordinates helps with distance calculations for blood bank matching.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    {...register('coordinates.lat', { valueAsNumber: true })}
                                    placeholder="40.7128"
                                />
                                {errors.coordinates?.lat && (
                                    <p className="text-sm text-red-600">{errors.coordinates.lat.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    {...register('coordinates.lng', { valueAsNumber: true })}
                                    placeholder="-74.0060"
                                />
                                {errors.coordinates?.lng && (
                                    <p className="text-sm text-red-600">{errors.coordinates.lng.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error/Success Messages */}
                    {submitError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{submitError}</AlertDescription>
                        </Alert>
                    )}

                    {submitSuccess && (
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Healthcare facility registered successfully!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <div className="pt-6 border-t">
                        <Button
                            type="submit"
                            disabled={isLoading || isSubmitting}
                            className="w-full md:w-auto"
                            size="lg"
                        >
                            {(isLoading || isSubmitting) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Register Healthcare Facility
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}