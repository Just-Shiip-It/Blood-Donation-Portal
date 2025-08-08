'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { ReactNode } from 'react'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FormWrapperProps {
    schema: z.ZodSchema<any>
    defaultValues?: Record<string, any>
    onSubmit: (data: any) => void | Promise<void>
    children: (form: UseFormReturn<any>) => ReactNode
    className?: string
    submitText?: string
    isLoading?: boolean
    disabled?: boolean
    showSubmitButton?: boolean
}

export function FormWrapper({
    schema,
    defaultValues,
    onSubmit,
    children,
    className,
    submitText = 'Submit',
    isLoading = false,
    disabled = false,
    showSubmitButton = true,
}: FormWrapperProps) {
    const form = useForm({
        // @ts-expect-error - Type compatibility issue with zodResolver
        resolver: zodResolver(schema),
        defaultValues,
    })

    const handleSubmit = async (data: any) => {
        try {
            await onSubmit(data)
        } catch (error) {
            console.error('Form submission error:', error)
        }
    }

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className={cn("space-y-6", className)}
            >
                {children(form)}
                {showSubmitButton && (
                    <Button
                        type="submit"
                        disabled={disabled || isLoading}
                        className="w-full"
                    >
                        {isLoading ? 'Loading...' : submitText}
                    </Button>
                )}
            </form>
        </Form>
    )
}