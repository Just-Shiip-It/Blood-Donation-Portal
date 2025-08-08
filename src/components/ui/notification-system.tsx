'use client'

import { toast } from 'sonner'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationOptions {
    title?: string
    description?: string
    duration?: number
    action?: {
        label: string
        onClick: () => void
    }
    dismissible?: boolean
}

class NotificationService {
    private getIcon(type: NotificationType) {
        const icons = {
            success: CheckCircle,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info
        }
        return icons[type]
    }

    private show(
        type: NotificationType,
        message: string,
        options: NotificationOptions = {}
    ) {
        const {
            title,
            description,
            duration = 4000,
            action,
            dismissible = true
        } = options

        const Icon = this.getIcon(type)

        const toastOptions = {
            duration,
            dismissible,
            icon: <Icon className="h-4 w-4" />,
            action: action ? {
                label: action.label,
                onClick: action.onClick
            } : undefined,
            cancel: dismissible ? {
                label: <X className="h-4 w-4" />,
                onClick: () => { }
            } : undefined
        }

        if (title || description) {
            return toast(title || message, {
                ...toastOptions,
                description: description || (title ? message : undefined)
            })
        }

        return toast[type](message, toastOptions)
    }

    success(message: string, options?: NotificationOptions) {
        return this.show('success', message, options)
    }

    error(message: string, options?: NotificationOptions) {
        return this.show('error', message, {
            duration: 6000, // Longer duration for errors
            ...options
        })
    }

    warning(message: string, options?: NotificationOptions) {
        return this.show('warning', message, options)
    }

    info(message: string, options?: NotificationOptions) {
        return this.show('info', message, options)
    }

    // Specialized notifications for blood donation context
    appointmentBooked(date: string, location: string) {
        return this.success('Appointment Booked Successfully', {
            description: `Your donation appointment is scheduled for ${date} at ${location}`,
            duration: 5000
        })
    }

    appointmentCancelled() {
        return this.info('Appointment Cancelled', {
            description: 'Your appointment has been cancelled successfully'
        })
    }

    donationCompleted(bloodType: string) {
        return this.success('Thank You for Donating!', {
            description: `Your ${bloodType} blood donation has been recorded`,
            duration: 6000
        })
    }

    urgentBloodRequest(bloodType: string, location: string) {
        return this.warning('Urgent Blood Request', {
            description: `${bloodType} blood needed urgently at ${location}`,
            duration: 8000,
            action: {
                label: 'View Details',
                onClick: () => {
                    // Navigate to request details
                    window.location.href = '/requests'
                }
            }
        })
    }

    eligibilityReminder(nextDonationDate: string) {
        return this.info('You\'re Eligible to Donate Again!', {
            description: `You can schedule your next donation starting ${nextDonationDate}`,
            duration: 5000,
            action: {
                label: 'Book Now',
                onClick: () => {
                    window.location.href = '/appointments/book'
                }
            }
        })
    }

    inventoryLow(bloodType: string, unitsRemaining: number) {
        return this.warning('Low Blood Inventory Alert', {
            description: `Only ${unitsRemaining} units of ${bloodType} remaining`,
            duration: 6000
        })
    }

    profileUpdated() {
        return this.success('Profile Updated', {
            description: 'Your profile information has been saved successfully'
        })
    }

    authError(message?: string) {
        return this.error('Authentication Error', {
            description: message || 'Please log in to continue',
            action: {
                label: 'Login',
                onClick: () => {
                    window.location.href = '/login'
                }
            }
        })
    }

    networkError() {
        return this.error('Connection Error', {
            description: 'Please check your internet connection and try again',
            action: {
                label: 'Retry',
                onClick: () => {
                    window.location.reload()
                }
            }
        })
    }

    // Batch dismiss all notifications
    dismissAll() {
        toast.dismiss()
    }

    // Promise-based notifications for async operations
    async promise<T>(
        promise: Promise<T>,
        {
            loading = 'Loading...',
            success = 'Success!',
            error = 'Something went wrong'
        }: {
            loading?: string
            success?: string | ((data: T) => string)
            error?: string | ((error: Error) => string)
        }
    ) {
        return toast.promise(promise, {
            loading,
            success: typeof success === 'function' ? success : () => success,
            error: typeof error === 'function' ? error : () => error
        })
    }
}

// Export singleton instance
export const notifications = new NotificationService()

// Export individual methods for convenience
export const {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo
} = notifications