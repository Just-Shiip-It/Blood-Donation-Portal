'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bloodRequestFulfillmentSchema, type BloodRequestFulfillmentInput } from '@/lib/validations/blood-request'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, CheckCircle, Droplet, Building2, Clock, Package } from 'lucide-react'
import type { BloodRequest } from '@/lib/services/blood-request'
import type { InventoryMatch } from '@/lib/services/blood-request'

interface BloodRequestFulfillmentProps {
    request: BloodRequest
    inventoryMatches: InventoryMatch[]
    onFulfill: (data: BloodRequestFulfillmentInput) => Promise<void>
    onFindMatches: () => Promise<void>
    isLoading?: boolean
    isFindingMatches?: boolean
}

export function BloodRequestFulfillment({
    request,
    inventoryMatches,
    onFulfill,
    onFindMatches,
    isLoading = false,
    isFindingMatches = false
}: BloodRequestFulfillmentProps) {
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [selectedBloodBank, setSelectedBloodBank] = useState<InventoryMatch | null>(null)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<BloodRequestFulfillmentInput>({
        resolver: zodResolver(bloodRequestFulfillmentSchema),
        defaultValues: {
            unitsProvided: request.unitsRequested,
            notes: ''
        }
    })

    const watchedBloodBankId = watch('bloodBankId')
    const watchedUnitsProvided = watch('unitsProvided')

    useEffect(() => {
        if (watchedBloodBankId) {
            const match = inventoryMatches.find(m => m.bloodBankId === watchedBloodBankId)
            setSelectedBloodBank(match || null)
        }
    }, [watchedBloodBankId, inventoryMatches])

    const handleFormSubmit = async (data: BloodRequestFulfillmentInput) => {
        try {
            setSubmitError(null)
            setSubmitSuccess(false)
            await onFulfill(data)
            setSubmitSuccess(true)
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to fulfill blood request')
        }
    }

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'emergency':
                return 'bg-red-100 text-red-800'
            case 'urgent':
                return 'bg-yellow-100 text-yellow-800'
            default:
                return 'bg-blue-100 text-blue-800'
        }
    }

    const formatDistance = (distance?: number) => {
        if (!distance) return 'Distance unknown'
        return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`
    }

    const canFulfillWithUnits = (match: InventoryMatch, units: number) => {
        return match.unitsAvailable >= units
    }

    return (
        <div className="space-y-6">
            {/* Request Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-red-500" />
                        Blood Request Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Request ID</Label>
                            <p className="font-medium">#{request.id.slice(-8)}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Blood Type</Label>
                            <div className="flex items-center gap-2">
                                <Droplet className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-lg">{request.bloodType}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Units Requested</Label>
                            <p className="font-medium text-lg">{request.unitsRequested}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Urgency</Label>
                            <Badge className={getUrgencyColor(request.urgencyLevel)}>
                                {request.urgencyLevel}
                            </Badge>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Healthcare Facility</Label>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="font-medium">{request.facility?.name}</p>
                                    <p className="text-sm text-gray-500">{request.facility?.facilityType}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-gray-500">Required By</Label>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <p className="font-medium">
                                    {new Date(request.requiredBy).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {request.notes && (
                        <>
                            <Separator className="my-4" />
                            <div className="space-y-1">
                                <Label className="text-sm text-gray-500">Request Notes</Label>
                                <p className="text-sm bg-gray-50 p-3 rounded-md">{request.notes}</p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Inventory Matches */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-500" />
                                Available Inventory Matches
                            </CardTitle>
                            <CardDescription>
                                Blood banks with compatible blood types and sufficient inventory
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onFindMatches}
                            disabled={isFindingMatches}
                        >
                            {isFindingMatches && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Refresh Matches
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {inventoryMatches.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No inventory matches found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Try refreshing or check if blood banks have sufficient inventory
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {inventoryMatches.map((match) => (
                                <div
                                    key={match.bloodBankId}
                                    className={`p-4 border rounded-lg ${selectedBloodBank?.bloodBankId === match.bloodBankId
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Building2 className="h-5 w-5 text-gray-400" />
                                                <h4 className="font-medium">{match.bloodBankName}</h4>
                                                {match.bloodType === request.bloodType ? (
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                        Exact Match
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                        Compatible
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Blood Type:</span>
                                                    <p className="font-medium">{match.bloodType}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Available:</span>
                                                    <p className="font-medium">{match.unitsAvailable} units</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Distance:</span>
                                                    <p className="font-medium">{formatDistance(match.distance)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Can Fulfill:</span>
                                                    <p className={`font-medium ${canFulfillWithUnits(match, watchedUnitsProvided || request.unitsRequested)
                                                        ? 'text-green-600'
                                                        : 'text-red-600'
                                                        }`}>
                                                        {canFulfillWithUnits(match, watchedUnitsProvided || request.unitsRequested)
                                                            ? 'Yes'
                                                            : 'Insufficient'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fulfillment Form */}
            {inventoryMatches.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Fulfill Blood Request</CardTitle>
                        <CardDescription>
                            Select a blood bank and specify the units to provide
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="bloodBankId">Select Blood Bank *</Label>
                                <Select
                                    onValueChange={(value) => setValue('bloodBankId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a blood bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {inventoryMatches.map((match) => (
                                            <SelectItem key={match.bloodBankId} value={match.bloodBankId}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{match.bloodBankName}</span>
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        {match.bloodType} - {match.unitsAvailable} units
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.bloodBankId && (
                                    <p className="text-sm text-red-600">{errors.bloodBankId.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unitsProvided">Units to Provide *</Label>
                                <Input
                                    id="unitsProvided"
                                    type="number"
                                    min="1"
                                    max={selectedBloodBank?.unitsAvailable || request.unitsRequested}
                                    {...register('unitsProvided', { valueAsNumber: true })}
                                />
                                {errors.unitsProvided && (
                                    <p className="text-sm text-red-600">{errors.unitsProvided.message}</p>
                                )}
                                {selectedBloodBank && watchedUnitsProvided && (
                                    <p className="text-sm text-gray-600">
                                        Available: {selectedBloodBank.unitsAvailable} units
                                        {watchedUnitsProvided > selectedBloodBank.unitsAvailable && (
                                            <span className="text-red-600 ml-2">
                                                (Insufficient inventory)
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Fulfillment Notes</Label>
                                <Textarea
                                    id="notes"
                                    {...register('notes')}
                                    placeholder="Any additional notes about the fulfillment"
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
                                        Blood request fulfilled successfully!
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                disabled={isLoading || isSubmitting || !selectedBloodBank}
                                className="w-full"
                                size="lg"
                            >
                                {(isLoading || isSubmitting) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Fulfill Blood Request
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}