'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { bloodBankRegistrationSchema, type BloodBankRegistration } from '@/lib/validations/blood-bank'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface BloodBankRegistrationProps {
    onSuccess?: (bloodBankId: string) => void
}

export function BloodBankRegistration({ onSuccess }: BloodBankRegistrationProps) {
    const [step, setStep] = useState(1)

    const form = useForm<BloodBankRegistration>({
        resolver: zodResolver(bloodBankRegistrationSchema),
        defaultValues: {
            email: '',
            password: '',
            confirmPassword: '',
            bloodBank: {
                name: '',
                address: {
                    street: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'US'
                },
                phone: '',
                email: '',
                capacity: 100,
                operatingHours: {
                    monday: { open: '08:00', close: '17:00', closed: false },
                    tuesday: { open: '08:00', close: '17:00', closed: false },
                    wednesday: { open: '08:00', close: '17:00', closed: false },
                    thursday: { open: '08:00', close: '17:00', closed: false },
                    friday: { open: '08:00', close: '17:00', closed: false },
                    saturday: { open: '08:00', close: '12:00', closed: false },
                    sunday: { open: '08:00', close: '12:00', closed: true }
                }
            }
        }
    })

    const registerMutation = useMutation({
        mutationFn: async (data: BloodBankRegistration) => {
            // First create the user account
            const authResponse = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    role: 'admin'
                })
            })

            if (!authResponse.ok) {
                throw new Error('Failed to create user account')
            }

            // Then create the blood bank profile
            const bloodBankResponse = await fetch('/api/bloodbanks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data.bloodBank)
            })

            if (!bloodBankResponse.ok) {
                throw new Error('Failed to create blood bank profile')
            }

            const result = await bloodBankResponse.json()
            return result.data.id
        },
        onSuccess: (bloodBankId) => {
            toast.success('Blood bank registered successfully!')
            onSuccess?.(bloodBankId)
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Registration failed')
        }
    })

    const onSubmit = (data: BloodBankRegistration) => {
        registerMutation.mutate(data)
    }

    const nextStep = async () => {
        const isValid = await form.trigger(step === 1 ? ['email', 'password', 'confirmPassword'] : undefined)
        if (isValid) {
            setStep(step + 1)
        }
    }

    const prevStep = () => {
        setStep(step - 1)
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Blood Bank Registration</CardTitle>
                <CardDescription>
                    Step {step} of 3: {step === 1 ? 'Account Information' : step === 2 ? 'Blood Bank Details' : 'Operating Hours'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="admin@bloodbank.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Enter password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Confirm password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="bloodBank.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Blood Bank Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="City Blood Bank" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bloodBank.email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Blood Bank Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="contact@bloodbank.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="bloodBank.phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(555) 123-4567" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="bloodBank.address.street"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Street Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123 Main Street" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bloodBank.address.city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="New York" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bloodBank.address.state"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>State</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="NY" maxLength={2} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bloodBank.address.zipCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ZIP Code</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="10001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="bloodBank.capacity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Capacity</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="100"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Operating Hours</h3>
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                    <div key={day} className="flex items-center space-x-4">
                                        <div className="w-20 capitalize">{day}</div>
                                        <FormField
                                            control={form.control}
                                            name={`bloodBank.operatingHours.${day}.open` as any}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="time" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <span>to</span>
                                        <FormField
                                            control={form.control}
                                            name={`bloodBank.operatingHours.${day}.close` as any}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="time" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`bloodBank.operatingHours.${day}.closed` as any}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <input
                                                            type="checkbox"
                                                            checked={field.value}
                                                            onChange={field.onChange}
                                                            className="h-4 w-4"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <span className="text-sm text-gray-500">Closed</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between">
                            {step > 1 && (
                                <Button type="button" variant="outline" onClick={prevStep}>
                                    Previous
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button type="button" onClick={nextStep} className="ml-auto">
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={registerMutation.isPending}
                                    className="ml-auto"
                                >
                                    {registerMutation.isPending ? (
                                        <>
                                            <LoadingSpinner className="mr-2 h-4 w-4" />
                                            Registering...
                                        </>
                                    ) : (
                                        'Register Blood Bank'
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}