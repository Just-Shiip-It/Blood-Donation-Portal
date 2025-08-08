'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface LoginFormProps {
    redirectTo?: string
}

export function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isResendingConfirmation, setIsResendingConfirmation] = useState(false)
    const [showResendConfirmation, setShowResendConfirmation] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema)
    })

    const onSubmit = async (data: LoginInput) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!result.success) {
                // Handle email not confirmed error
                if (result.error?.code === 'EMAIL_NOT_CONFIRMED') {
                    setUserEmail(data.email)
                    setShowResendConfirmation(true)
                    toast.error(result.error.message)
                } else {
                    toast.error(result.error?.message || 'Login failed')
                }
                return
            }

            toast.success('Login successful!')

            // Redirect based on user role or provided redirect
            const userRole = result.data.user.role
            let redirectUrl = redirectTo

            if (redirectTo === '/dashboard') {
                switch (userRole) {
                    case 'admin':
                    case 'system_admin':
                        redirectUrl = '/admin'
                        break
                    case 'facility':
                        redirectUrl = '/facility'
                        break
                    default:
                        redirectUrl = '/dashboard'
                }
            }

            router.push(redirectUrl)
            router.refresh()

        } catch (error) {
            console.error('Login error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendConfirmation = async () => {
        setIsResendingConfirmation(true)

        try {
            const response = await fetch('/api/auth/resend-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
            })

            const result = await response.json()

            if (result.success) {
                toast.success('Confirmation email sent! Please check your inbox.')
                setShowResendConfirmation(false)
            } else {
                toast.error(result.error?.message || 'Failed to send confirmation email')
            }
        } catch (error) {
            console.error('Resend confirmation error:', error)
            toast.error('An unexpected error occurred')
        } finally {
            setIsResendingConfirmation(false)
        }
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white shadow-lg rounded-lg p-8">
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        {...register('email')}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        {...register('password')}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.password && (
                        <p className="text-sm text-red-600">{errors.password.message}</p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Signing in...
                        </div>
                    ) : (
                        'Sign In'
                    )}
                </Button>
            </form>

            {showResendConfirmation && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-center">
                        <p className="text-sm text-yellow-800 mb-3">
                            Your email address needs to be confirmed before you can log in.
                        </p>
                        <Button
                            onClick={handleResendConfirmation}
                            disabled={isResendingConfirmation}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                            {isResendingConfirmation ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Sending...
                                </div>
                            ) : (
                                'Resend Confirmation Email'
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <a
                        href="/register"
                        className="font-medium text-blue-600 hover:text-blue-500 underline"
                    >
                        Sign up
                    </a>
                </p>
                <p className="text-sm text-gray-600">
                    <a
                        href="/forgot-password"
                        className="font-medium text-blue-600 hover:text-blue-500 underline"
                    >
                        Forgot your password?
                    </a>
                </p>
            </div>
        </div>
    )
}