'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, AlertCircle, CheckCircle } from 'lucide-react'
import { createDonationRecordSchema, type CreateDonationRecord } from '@/lib/validations/donation-history'
import { z } from 'zod'

// Form schema with all required fields
const formSchema = createDonationRecordSchema.extend({
    unitsCollected: z.number().min(0.5).max(2)
})

interface CreateDonationRecordProps {
    donorId?: string
    bloodBankId?: string
    appointmentId?: string
    onSuccess?: (donation: unknown) => void
    onCancel?: () => void
}

export default function CreateDonationRecord({
    donorId,
    bloodBankId,
    appointmentId,
    onSuccess,
    onCancel
}: CreateDonationRecordProps) {
    const [showHealthMetrics, setShowHealthMetrics] = useState(false)
    const queryClient = useQueryClient()

    const form = useForm<CreateDonationRecord>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            donorId: donorId || '',
            bloodBankId: bloodBankId || '',
            appointmentId: appointmentId || undefined,
            donationDate: new Date().toISOString().split('T')[0],
            bloodType: 'O+' as const,
            unitsCollected: 1,
            healthMetrics: undefined,
            notes: ''
        }
    })

    const createDonationMutation = useMutation({
        mutationFn: async (data: CreateDonationRecord) => {
            const response = await fetch('/api/donations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create donation record')
            }

            return response.json()
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['donation-history'] })
            queryClient.invalidateQueries({ queryKey: ['donation-stats'] })
            queryClient.invalidateQueries({ queryKey: ['health-insights'] })

            if (onSuccess) {
                onSuccess(result.data)
            }
        }
    })

    const onSubmit = (data: CreateDonationRecord) => {
        // Clean up health metrics if not provided
        if (!showHealthMetrics || !data.healthMetrics) {
            data.healthMetrics = undefined
        }

        createDonationMutation.mutate(data)
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Create Donation Record
                </CardTitle>
                <CardDescription>
                    Record a completed blood donation with health metrics and notes
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Donation Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="donorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Donor ID</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter donor ID" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bloodBankId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Blood Bank ID</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter blood bank ID" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="donationDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Donation Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bloodType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Blood Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select blood type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="A+">A+</SelectItem>
                                                    <SelectItem value="A-">A-</SelectItem>
                                                    <SelectItem value="B+">B+</SelectItem>
                                                    <SelectItem value="B-">B-</SelectItem>
                                                    <SelectItem value="AB+">AB+</SelectItem>
                                                    <SelectItem value="AB-">AB-</SelectItem>
                                                    <SelectItem value="O+">O+</SelectItem>
                                                    <SelectItem value="O-">O-</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="unitsCollected"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Units Collected</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    max="2"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Typical donation is 1 unit (450ml)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {appointmentId && (
                                <FormField
                                    control={form.control}
                                    name="appointmentId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Appointment ID (Optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Link to appointment" />
                                            </FormControl>
                                            <FormDescription>
                                                Link this donation to an existing appointment
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <Separator />

                        {/* Health Metrics Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Health Metrics</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHealthMetrics(!showHealthMetrics)}
                                >
                                    {showHealthMetrics ? 'Hide' : 'Add'} Health Metrics
                                </Button>
                            </div>

                            {showHealthMetrics && (
                                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Blood Pressure</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Systolic"
                                                    min="80"
                                                    max="200"
                                                    onChange={(e) => {
                                                        const current = form.getValues('healthMetrics') || {}
                                                        const currentBP = current.bloodPressure || { systolic: 0, diastolic: 0 }
                                                        form.setValue('healthMetrics', {
                                                            ...current,
                                                            bloodPressure: {
                                                                ...currentBP,
                                                                systolic: parseInt(e.target.value) || 0
                                                            }
                                                        })
                                                    }}
                                                />
                                                <span className="flex items-center">/</span>
                                                <Input
                                                    type="number"
                                                    placeholder="Diastolic"
                                                    min="40"
                                                    max="120"
                                                    onChange={(e) => {
                                                        const current = form.getValues('healthMetrics') || {}
                                                        const currentBP = current.bloodPressure || { systolic: 0, diastolic: 0 }
                                                        form.setValue('healthMetrics', {
                                                            ...current,
                                                            bloodPressure: {
                                                                ...currentBP,
                                                                diastolic: parseInt(e.target.value) || 0
                                                            }
                                                        })
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Hemoglobin (g/dL)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="8"
                                                max="20"
                                                placeholder="12.5"
                                                onChange={(e) => {
                                                    const current = form.getValues('healthMetrics') || {}
                                                    form.setValue('healthMetrics', {
                                                        ...current,
                                                        hemoglobin: parseFloat(e.target.value) || undefined
                                                    })
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Pulse (BPM)</Label>
                                            <Input
                                                type="number"
                                                min="40"
                                                max="120"
                                                placeholder="72"
                                                onChange={(e) => {
                                                    const current = form.getValues('healthMetrics') || {}
                                                    form.setValue('healthMetrics', {
                                                        ...current,
                                                        pulse: parseInt(e.target.value) || undefined
                                                    })
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Temperature (°F)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="95"
                                                max="105"
                                                placeholder="98.6"
                                                onChange={(e) => {
                                                    const current = form.getValues('healthMetrics') || {}
                                                    form.setValue('healthMetrics', {
                                                        ...current,
                                                        temperature: parseFloat(e.target.value) || undefined
                                                    })
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Weight (lbs)</Label>
                                            <Input
                                                type="number"
                                                min="110"
                                                max="500"
                                                placeholder="150"
                                                onChange={(e) => {
                                                    const current = form.getValues('healthMetrics') || {}
                                                    form.setValue('healthMetrics', {
                                                        ...current,
                                                        weight: parseInt(e.target.value) || undefined
                                                    })
                                                }}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Height (inches)</Label>
                                            <Input
                                                type="number"
                                                min="48"
                                                max="84"
                                                placeholder="68"
                                                onChange={(e) => {
                                                    const current = form.getValues('healthMetrics') || {}
                                                    form.setValue('healthMetrics', {
                                                        ...current,
                                                        height: parseInt(e.target.value) || undefined
                                                    })
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Health Notes</Label>
                                        <Textarea
                                            placeholder="Any additional health observations..."
                                            onChange={(e) => {
                                                const current = form.getValues('healthMetrics') || {}
                                                form.setValue('healthMetrics', {
                                                    ...current,
                                                    notes: e.target.value
                                                })
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Notes Section */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Additional Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Any additional notes about the donation..."
                                            rows={3}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Optional notes about the donation process or any observations
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Error Display */}
                        {createDonationMutation.error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {createDonationMutation.error.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Success Display */}
                        {createDonationMutation.isSuccess && (
                            <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Donation record created successfully!
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            {onCancel && (
                                <Button type="button" variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                            )}
                            <Button
                                type="submit"
                                disabled={createDonationMutation.isPending}
                                className="min-w-[120px]"
                            >
                                {createDonationMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Record'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}