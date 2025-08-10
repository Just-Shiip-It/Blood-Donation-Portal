'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bloodRequestSchema, type BloodRequestInput } from '@/lib/validations/blood-request'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface BloodRequestFormProps {
    onSubmit: (data: BloodRequestInput) => Promise<void>
    isLoading?: boolean
    initialData?: Partial<BloodRequestInput>
}

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const
const urgencyLevels = [
    { value: 'routine', label: 'Routine', description: 'Standard request, no immediate urgency' },
    { value: 'urgent', label: 'Urgent', description: 'Needed within 24-48 hours' },
    { value: 'emergency', label: 'Emergency', description: 'Critical - needed immediately' }
] as const

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
] as const

export function BloodRequestForm({ onSubmit, isLoading = false, initialData }: BloodRequestFormProps) {
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<BloodRequestInput>({
        resolver: zodResolver(bloodRequestSchema),
        defaultValues: {
            bloodType: initialData?.bloodType,
            unitsRequested: initialData?.unitsRequested || 1,
            urgencyLevel: initialData?.urgencyLevel,
            patientInfo: initialData?.patientInfo || {},
            requiredBy: initialData?.requiredBy,
            notes: initialData?.notes || ''
        }
    })

    const watchedUrgencyLevel = watch('urgencyLevel')

    const handleFormSubmit = async (data: BloodRequestInput) => {
        try {
            setSubmitError(null)
            setSubmitSuccess(false)
            await onSubmit(data)
            setSubmitSuccess(true)
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to submit blood request')
        }
    }

    const getMinDateTime = () => {
        const now = new Date()
        now.setMinutes(now.getMinutes() + 30) // Minimum 30 minutes from now
        return now.toISOString().slice(0, 16)
    }

    const getMaxDateTime = () => {
        const maxDate = new Date()
        maxDate.setFullYear(maxDate.getFullYear() + 1) // Maximum 1 year from now
        return maxDate.toISOString().slice(0, 16)
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Blood Request Form</CardTitle>
                <CardDescription>
                    Submit a request for blood units. All fields marked with * are required.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                    {/* Blood Type and Units */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bloodType">Blood Type *</Label>
                            <Select
                                onValueChange={(value) => setValue('bloodType', value as typeof bloodTypes[number])}
                                defaultValue={initialData?.bloodType}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select blood type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bloodTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.bloodType && (
                                <p className="text-sm text-red-600">{errors.bloodType.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unitsRequested">Units Requested *</Label>
                            <Input
                                id="unitsRequested"
                                type="number"
                                min="1"
                                max="50"
                                {...register('unitsRequested', { valueAsNumber: true })}
                                placeholder="Number of units"
                            />
                            {errors.unitsRequested && (
                                <p className="text-sm text-red-600">{errors.unitsRequested.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Urgency Level */}
                    <div className="space-y-2">
                        <Label htmlFor="urgencyLevel">Urgency Level *</Label>
                        <Select
                            onValueChange={(value) => setValue('urgencyLevel', value as typeof urgencyLevels[number]['value'])}
                            defaultValue={initialData?.urgencyLevel}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select urgency level" />
                            </SelectTrigger>
                            <SelectContent>
                                {urgencyLevels.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{level.label}</span>
                                            <span className="text-sm text-gray-500">{level.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.urgencyLevel && (
                            <p className="text-sm text-red-600">{errors.urgencyLevel.message}</p>
                        )}
                    </div>

                    {/* Required By Date */}
                    <div className="space-y-2">
                        <Label htmlFor="requiredBy">Required By *</Label>
                        <Input
                            id="requiredBy"
                            type="datetime-local"
                            min={getMinDateTime()}
                            max={getMaxDateTime()}
                            {...register('requiredBy')}
                        />
                        {errors.requiredBy && (
                            <p className="text-sm text-red-600">{errors.requiredBy.message}</p>
                        )}
                        {watchedUrgencyLevel === 'emergency' && (
                            <p className="text-sm text-amber-600">
                                ⚠️ Emergency requests should be needed within the next few hours
                            </p>
                        )}
                    </div>

                    {/* Patient Information */}
                    <div className="space-y-4">
                        <Label className="text-base font-medium">Patient Information (Optional)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-gray-200">
                            <div className="space-y-2">
                                <Label htmlFor="patientAge">Patient Age</Label>
                                <Input
                                    id="patientAge"
                                    type="number"
                                    min="0"
                                    max="120"
                                    {...register('patientInfo.age', { valueAsNumber: true })}
                                    placeholder="Age in years"
                                />
                                {errors.patientInfo?.age && (
                                    <p className="text-sm text-red-600">{errors.patientInfo.age.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="patientGender">Patient Gender</Label>
                                <Select
                                    onValueChange={(value) => setValue('patientInfo.gender', value as typeof genderOptions[number]['value'])}
                                    defaultValue={initialData?.patientInfo?.gender}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {genderOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="medicalCondition">Medical Condition</Label>
                                <Input
                                    id="medicalCondition"
                                    {...register('patientInfo.medicalCondition')}
                                    placeholder="Brief description of condition"
                                    maxLength={500}
                                />
                                {errors.patientInfo?.medicalCondition && (
                                    <p className="text-sm text-red-600">{errors.patientInfo.medicalCondition.message}</p>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="procedureType">Procedure Type</Label>
                                <Input
                                    id="procedureType"
                                    {...register('patientInfo.procedureType')}
                                    placeholder="Type of medical procedure"
                                    maxLength={200}
                                />
                                {errors.patientInfo?.procedureType && (
                                    <p className="text-sm text-red-600">{errors.patientInfo.procedureType.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                            id="notes"
                            {...register('notes')}
                            placeholder="Any additional information or special requirements"
                            rows={3}
                            maxLength={1000}
                        />
                        {errors.notes && (
                            <p className="text-sm text-red-600">{errors.notes.message}</p>
                        )}
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
                                Blood request submitted successfully!
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={isLoading || isSubmitting}
                        className="w-full"
                        size="lg"
                    >
                        {(isLoading || isSubmitting) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Submit Blood Request
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}