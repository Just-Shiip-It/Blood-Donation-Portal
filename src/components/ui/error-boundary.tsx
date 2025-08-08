'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.props.onError?.(error, errorInfo)
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex min-h-[400px] items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <CardTitle>Something went wrong</CardTitle>
                            <CardDescription>
                                An unexpected error occurred. Please try refreshing the page.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Alert>
                                    <AlertDescription className="text-xs font-mono">
                                        {this.state.error.message}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div className="flex flex-col space-y-2">
                                <Button onClick={this.handleReset} className="w-full">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="w-full"
                                >
                                    Refresh Page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

// Hook-based error boundary for functional components
interface ErrorFallbackProps {
    error: Error
    resetError: () => void
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
    return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <CardTitle className="text-lg">Error</CardTitle>
                    <CardDescription>
                        Something went wrong with this component.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {process.env.NODE_ENV === 'development' && (
                        <Alert className="mb-4">
                            <AlertDescription className="text-xs font-mono">
                                {error.message}
                            </AlertDescription>
                        </Alert>
                    )}
                    <Button onClick={resetError} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

// Simple error display component
interface ErrorDisplayProps {
    title?: string
    message?: string
    onRetry?: () => void
    className?: string
}

export function ErrorDisplay({
    title = 'Error',
    message = 'Something went wrong. Please try again.',
    onRetry,
    className
}: ErrorDisplayProps) {
    return (
        <div className={className}>
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    <div className="space-y-2">
                        <p className="font-medium">{title}</p>
                        <p className="text-sm">{message}</p>
                        {onRetry && (
                            <Button variant="outline" size="sm" onClick={onRetry}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Retry
                            </Button>
                        )}
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    )
}