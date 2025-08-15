'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ClientErrorHandler, getUserFriendlyMessage } from '@/lib/errors/handlers'
import { AppError, ErrorSeverity } from '@/lib/errors/types'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
    showReportButton?: boolean
    showHomeButton?: boolean
    level?: 'page' | 'component' | 'section'
}

interface State {
    hasError: boolean
    error?: Error
    errorId?: string
    retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
    private maxRetries = 3
    private errorHandler = ClientErrorHandler.getInstance()

    public state: State = {
        hasError: false,
        retryCount: 0
    }

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retryCount: 0
        }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)

        // Report error to error handler
        this.errorHandler.handleError(error, {
            errorInfo,
            component: 'ErrorBoundary',
            level: this.props.level || 'component',
            retryCount: this.state.retryCount
        })

        this.props.onError?.(error, errorInfo)
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: undefined,
            errorId: undefined,
            retryCount: this.state.retryCount + 1
        })
    }

    private handleReportError = () => {
        if (this.state.error && this.state.errorId) {
            const subject = `Error Report - ${this.state.errorId}`
            const body = `Error ID: ${this.state.errorId}\nError: ${this.state.error.message}\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}`
            window.open(`mailto:support@blooddonationportal.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
        }
    }

    private getErrorSeverity(): ErrorSeverity {
        if (this.state.error instanceof AppError) {
            return this.state.error.severity
        }
        return ErrorSeverity.MEDIUM
    }

    private getErrorMessage(): string {
        if (this.state.error instanceof AppError) {
            return getUserFriendlyMessage(this.state.error.code)
        }
        return 'An unexpected error occurred. Please try again.'
    }

    private shouldShowRetry(): boolean {
        return this.state.retryCount < this.maxRetries
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            const severity = this.getErrorSeverity()
            const message = this.getErrorMessage()
            const isPageLevel = this.props.level === 'page'
            const minHeight = isPageLevel ? 'min-h-[400px]' : 'min-h-[200px]'

            return (
                <div className={`flex ${minHeight} items-center justify-center p-4`}>
                    <Card className={`w-full ${isPageLevel ? 'max-w-md' : 'max-w-sm'}`}>
                        <CardHeader className="text-center">
                            <div className={`mx-auto mb-4 flex ${isPageLevel ? 'h-12 w-12' : 'h-10 w-10'} items-center justify-center rounded-full ${severity === ErrorSeverity.CRITICAL ? 'bg-red-100' :
                                    severity === ErrorSeverity.HIGH ? 'bg-orange-100' :
                                        'bg-yellow-100'
                                }`}>
                                <AlertTriangle className={`${isPageLevel ? 'h-6 w-6' : 'h-5 w-5'} ${severity === ErrorSeverity.CRITICAL ? 'text-red-600' :
                                        severity === ErrorSeverity.HIGH ? 'text-orange-600' :
                                            'text-yellow-600'
                                    }`} />
                            </div>
                            <CardTitle className={isPageLevel ? 'text-lg' : 'text-base'}>
                                {severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Something went wrong'}
                            </CardTitle>
                            <CardDescription className={isPageLevel ? 'text-sm' : 'text-xs'}>
                                {message}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Error ID for support */}
                            {this.state.errorId && (
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">
                                        Error ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
                                    </p>
                                </div>
                            )}

                            {/* Development error details */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <Collapsible>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-full">
                                            <Bug className="mr-2 h-4 w-4" />
                                            Show Error Details
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <Alert className="mt-2">
                                            <AlertDescription className="text-xs font-mono whitespace-pre-wrap">
                                                {this.state.error.message}
                                                {this.state.error.stack && (
                                                    <details className="mt-2">
                                                        <summary className="cursor-pointer">Stack Trace</summary>
                                                        <pre className="mt-1 text-xs overflow-auto">
                                                            {this.state.error.stack}
                                                        </pre>
                                                    </details>
                                                )}
                                            </AlertDescription>
                                        </Alert>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col space-y-2">
                                {this.shouldShowRetry() && (
                                    <Button onClick={this.handleReset} className="w-full">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${this.maxRetries})`}
                                    </Button>
                                )}

                                {!this.shouldShowRetry() && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.location.reload()}
                                        className="w-full"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Refresh Page
                                    </Button>
                                )}

                                {this.props.showHomeButton && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.location.href = '/'}
                                        className="w-full"
                                    >
                                        <Home className="mr-2 h-4 w-4" />
                                        Go Home
                                    </Button>
                                )}

                                {this.props.showReportButton && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={this.handleReportError}
                                        className="w-full"
                                    >
                                        <Mail className="mr-2 h-4 w-4" />
                                        Report Error
                                    </Button>
                                )}
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
    errorId?: string
}

export function ErrorFallback({ error, resetError, errorId }: ErrorFallbackProps) {
    const handleReportError = () => {
        if (errorId) {
            const subject = `Error Report - ${errorId}`
            const body = `Error ID: ${errorId}\nError: ${error.message}\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}`
            window.open(`mailto:support@blooddonationportal.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
        }
    }

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
                <CardContent className="space-y-4">
                    {errorId && (
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                                Error ID: <code className="bg-muted px-1 rounded">{errorId}</code>
                            </p>
                        </div>
                    )}

                    {process.env.NODE_ENV === 'development' && (
                        <Alert className="mb-4">
                            <AlertDescription className="text-xs font-mono">
                                {error.message}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col space-y-2">
                        <Button onClick={resetError} className="w-full">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReportError}
                            className="w-full"
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Report Error
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Simple error display component with enhanced features
interface ErrorDisplayProps {
    title?: string
    message?: string
    onRetry?: () => void
    className?: string
    severity?: ErrorSeverity
    showDetails?: boolean
    details?: string
    errorId?: string
}

export function ErrorDisplay({
    title = 'Error',
    message = 'Something went wrong. Please try again.',
    onRetry,
    className,
    severity = ErrorSeverity.MEDIUM,
    showDetails = false,
    details,
    errorId
}: ErrorDisplayProps) {
    const [showDetailedInfo, setShowDetailedInfo] = React.useState(false)

    const handleReportError = () => {
        if (errorId) {
            const subject = `Error Report - ${errorId}`
            const body = `Error ID: ${errorId}\nError: ${message}\nDetails: ${details || 'N/A'}\nPage: ${window.location.href}\nTime: ${new Date().toISOString()}`
            window.open(`mailto:support@blooddonationportal.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
        }
    }

    return (
        <div className={className}>
            <Alert className={
                severity === ErrorSeverity.CRITICAL ? 'border-red-200 bg-red-50' :
                    severity === ErrorSeverity.HIGH ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
            }>
                <AlertTriangle className={`h-4 w-4 ${severity === ErrorSeverity.CRITICAL ? 'text-red-600' :
                        severity === ErrorSeverity.HIGH ? 'text-orange-600' :
                            'text-yellow-600'
                    }`} />
                <AlertDescription>
                    <div className="space-y-3">
                        <div>
                            <p className="font-medium">{title}</p>
                            <p className="text-sm mt-1">{message}</p>
                        </div>

                        {errorId && (
                            <p className="text-xs text-muted-foreground">
                                Error ID: <code className="bg-muted px-1 rounded">{errorId}</code>
                            </p>
                        )}

                        {showDetails && details && (
                            <Collapsible open={showDetailedInfo} onOpenChange={setShowDetailedInfo}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <Bug className="mr-2 h-4 w-4" />
                                        {showDetailedInfo ? 'Hide' : 'Show'} Details
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                        {details}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {onRetry && (
                                <Button variant="outline" size="sm" onClick={onRetry}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Retry
                                </Button>
                            )}

                            {errorId && (
                                <Button variant="ghost" size="sm" onClick={handleReportError}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Report
                                </Button>
                            )}
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    )
}

// Network error component
interface NetworkErrorProps {
    onRetry?: () => void
    className?: string
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
    return (
        <ErrorDisplay
            title="Connection Error"
            message="Unable to connect to the server. Please check your internet connection and try again."
            onRetry={onRetry}
            className={className}
            severity={ErrorSeverity.HIGH}
        />
    )
}

// Form validation error component
interface FormErrorProps {
    errors: Record<string, string>
    className?: string
}

export function FormError({ errors, className }: FormErrorProps) {
    const errorCount = Object.keys(errors).length

    if (errorCount === 0) return null

    return (
        <Alert className={`border-red-200 bg-red-50 ${className}`}>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
                <div className="space-y-2">
                    <p className="font-medium">
                        Please fix the following {errorCount === 1 ? 'error' : 'errors'}:
                    </p>
                    <ul className="text-sm space-y-1">
                        {Object.entries(errors).map(([field, message]) => (
                            <li key={field} className="flex items-start">
                                <span className="font-medium mr-2">{field}:</span>
                                <span>{message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </AlertDescription>
        </Alert>
    )
}