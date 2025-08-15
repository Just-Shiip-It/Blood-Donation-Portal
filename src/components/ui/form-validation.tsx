'use client'

import React, { useState, useEffect } from 'react'
import { useFormContext, FieldError, FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatFormErrors } from '@/lib/errors/handlers'
import { ValidationError } from '@/lib/errors/types'

// Validation state types
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

interface ValidationResult {
    state: ValidationState
    message?: string
    errors?: string[]
}

// Enhanced form field with real-time validation
interface ValidatedFieldProps {
    name: string
    label?: string
    placeholder?: string
    type?: string
    schema?: z.ZodSchema
    validateOnChange?: boolean
    validateOnBlur?: boolean
    debounceMs?: number
    className?: string
    required?: boolean
    disabled?: boolean
    multiline?: boolean
    rows?: number
    asyncValidator?: (value: string) => Promise<ValidationResult>
}

export function ValidatedField({
    name,
    label,
    placeholder,
    type = 'text',
    schema,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 300,
    className,
    required = false,
    disabled = false,
    multiline = false,
    rows = 3,
    asyncValidator
}: ValidatedFieldProps) {
    const {
        register,
        watch,
        formState: { errors },
        trigger,
        setError,
        clearErrors
    } = useFormContext()

    const [validationState, setValidationState] = useState<ValidationState>('idle')
    const [validationMessage, setValidationMessage] = useState<string>('')
    const [isValidating, setIsValidating] = useState(false)

    const fieldValue = watch(name)
    const fieldError = errors[name] as FieldError

    // Debounced validation effect
    useEffect(() => {
        if (!validateOnChange || !fieldValue || fieldValue === '') {
            setValidationState('idle')
            setValidationMessage('')
            return
        }

        const timeoutId = setTimeout(async () => {
            await validateField(fieldValue)
        }, debounceMs)

        return () => clearTimeout(timeoutId)
    }, [fieldValue, validateOnChange, debounceMs])

    const validateField = async (value: string) => {
        if (!value || value === '') {
            setValidationState('idle')
            setValidationMessage('')
            return
        }

        setIsValidating(true)
        setValidationState('validating')

        try {
            // Schema validation
            if (schema) {
                const result = schema.safeParse(value)
                if (!result.success) {
                    const errorMessage = result.error.issues[0]?.message || 'Invalid input'
                    setValidationState('invalid')
                    setValidationMessage(errorMessage)
                    setError(name, { type: 'validation', message: errorMessage })
                    setIsValidating(false)
                    return
                }
            }

            // Async validation
            if (asyncValidator) {
                const asyncResult = await asyncValidator(value)
                setValidationState(asyncResult.state)
                setValidationMessage(asyncResult.message || '')

                if (asyncResult.state === 'invalid' && asyncResult.message) {
                    setError(name, { type: 'async', message: asyncResult.message })
                } else if (asyncResult.state === 'valid') {
                    clearErrors(name)
                }
            } else {
                setValidationState('valid')
                setValidationMessage('')
                clearErrors(name)
            }
        } catch (error) {
            setValidationState('invalid')
            setValidationMessage('Validation error occurred')
            setError(name, { type: 'validation', message: 'Validation error occurred' })
        }

        setIsValidating(false)
    }

    const handleBlur = async () => {
        if (validateOnBlur && fieldValue) {
            await validateField(fieldValue)
        }
    }

    const getValidationIcon = () => {
        if (isValidating) {
            return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        }

        switch (validationState) {
            case 'valid':
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case 'invalid':
                return <AlertCircle className="h-4 w-4 text-red-500" />
            default:
                return null
        }
    }

    const getFieldClassName = () => {
        const baseClass = className || ''

        if (fieldError) {
            return cn(baseClass, 'border-red-500 focus:border-red-500 focus:ring-red-500')
        }

        switch (validationState) {
            case 'valid':
                return cn(baseClass, 'border-green-500 focus:border-green-500 focus:ring-green-500')
            case 'invalid':
                return cn(baseClass, 'border-red-500 focus:border-red-500 focus:ring-red-500')
            default:
                return baseClass
        }
    }

    const InputComponent = multiline ? Textarea : Input

    return (
        <div className="space-y-2">
            {label && (
                <Label htmlFor={name} className="text-sm font-medium">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            <div className="relative">
                <InputComponent
                    id={name}
                    type={type}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={multiline ? rows : undefined}
                    className={cn(getFieldClassName(), 'pr-10')}
                    {...register(name, {
                        required: required ? `${label || name} is required` : false,
                        onBlur: handleBlur
                    })}
                />

                {/* Validation icon */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getValidationIcon()}
                </div>
            </div>

            {/* Error message */}
            {fieldError && (
                <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {fieldError.message}
                </p>
            )}

            {/* Validation message */}
            {!fieldError && validationMessage && (
                <p className={cn(
                    'text-sm flex items-center',
                    validationState === 'valid' ? 'text-green-600' : 'text-red-600'
                )}>
                    {validationState === 'valid' ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                    ) : (
                        <AlertCircle className="h-4 w-4 mr-1" />
                    )}
                    {validationMessage}
                </p>
            )}
        </div>
    )
}

// Form validation summary component
interface FormValidationSummaryProps {
    errors: FieldErrors
    className?: string
    showSuccessMessage?: boolean
    successMessage?: string
}

export function FormValidationSummary({
    errors,
    className,
    showSuccessMessage = false,
    successMessage = 'All fields are valid'
}: FormValidationSummaryProps) {
    const errorEntries = Object.entries(errors)
    const hasErrors = errorEntries.length > 0

    if (!hasErrors && !showSuccessMessage) {
        return null
    }

    if (!hasErrors && showSuccessMessage) {
        return (
            <Alert className={cn('border-green-200 bg-green-50', className)}>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                    {successMessage}
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert className={cn('border-red-200 bg-red-50', className)}>
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
                <div className="space-y-2">
                    <p className="font-medium text-red-800">
                        Please fix the following {errorEntries.length === 1 ? 'error' : 'errors'}:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1">
                        {errorEntries.map(([field, error]) => (
                            <li key={field} className="flex items-start">
                                <span className="font-medium mr-2 capitalize">
                                    {field.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span>{(error as FieldError)?.message || 'Invalid value'}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </AlertDescription>
        </Alert>
    )
}

// Password strength indicator
interface PasswordStrengthProps {
    password: string
    className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
    const [strength, setStrength] = useState(0)
    const [feedback, setFeedback] = useState<string[]>([])

    useEffect(() => {
        const calculateStrength = (pwd: string) => {
            let score = 0
            const newFeedback: string[] = []

            if (pwd.length >= 8) {
                score += 1
            } else {
                newFeedback.push('At least 8 characters')
            }

            if (/[a-z]/.test(pwd)) {
                score += 1
            } else {
                newFeedback.push('One lowercase letter')
            }

            if (/[A-Z]/.test(pwd)) {
                score += 1
            } else {
                newFeedback.push('One uppercase letter')
            }

            if (/\d/.test(pwd)) {
                score += 1
            } else {
                newFeedback.push('One number')
            }

            if (/[^a-zA-Z\d]/.test(pwd)) {
                score += 1
                newFeedback.pop() // Remove one requirement if special char is present
            }

            setStrength(score)
            setFeedback(newFeedback)
        }

        calculateStrength(password)
    }, [password])

    if (!password) return null

    const getStrengthColor = () => {
        if (strength <= 2) return 'bg-red-500'
        if (strength <= 3) return 'bg-yellow-500'
        if (strength <= 4) return 'bg-blue-500'
        return 'bg-green-500'
    }

    const getStrengthText = () => {
        if (strength <= 2) return 'Weak'
        if (strength <= 3) return 'Fair'
        if (strength <= 4) return 'Good'
        return 'Strong'
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Password strength:</span>
                <span className={cn(
                    'text-sm font-medium',
                    strength <= 2 ? 'text-red-600' :
                        strength <= 3 ? 'text-yellow-600' :
                            strength <= 4 ? 'text-blue-600' :
                                'text-green-600'
                )}>
                    {getStrengthText()}
                </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={cn('h-2 rounded-full transition-all duration-300', getStrengthColor())}
                    style={{ width: `${(strength / 5) * 100}%` }}
                />
            </div>

            {feedback.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    <p>Password needs:</p>
                    <ul className="list-disc list-inside space-y-1">
                        {feedback.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// Real-time field validation hook
export function useFieldValidation(
    name: string,
    schema?: z.ZodSchema,
    asyncValidator?: (value: string) => Promise<ValidationResult>
) {
    const { watch, setError, clearErrors } = useFormContext()
    const [validationState, setValidationState] = useState<ValidationState>('idle')
    const [isValidating, setIsValidating] = useState(false)

    const fieldValue = watch(name)

    const validate = async (value: string) => {
        if (!value || value === '') {
            setValidationState('idle')
            return
        }

        setIsValidating(true)
        setValidationState('validating')

        try {
            if (schema) {
                const result = schema.safeParse(value)
                if (!result.success) {
                    const errorMessage = result.error.issues[0]?.message || 'Invalid input'
                    setValidationState('invalid')
                    setError(name, { type: 'validation', message: errorMessage })
                    setIsValidating(false)
                    return
                }
            }

            if (asyncValidator) {
                const asyncResult = await asyncValidator(value)
                setValidationState(asyncResult.state)

                if (asyncResult.state === 'invalid' && asyncResult.message) {
                    setError(name, { type: 'async', message: asyncResult.message })
                } else if (asyncResult.state === 'valid') {
                    clearErrors(name)
                }
            } else {
                setValidationState('valid')
                clearErrors(name)
            }
        } catch (error) {
            setValidationState('invalid')
            setError(name, { type: 'validation', message: 'Validation error occurred' })
        }

        setIsValidating(false)
    }

    return {
        validationState,
        isValidating,
        validate
    }
}