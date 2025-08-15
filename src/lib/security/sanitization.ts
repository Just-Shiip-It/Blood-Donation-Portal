// Server-side HTML sanitization without JSDOM (Edge Runtime compatible)
import type DOMPurify from 'dompurify'

// Initialize DOMPurify only when needed and in the right environment
function getPurify(): typeof DOMPurify | null {
    if (typeof window !== 'undefined') {
        // Client-side
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const DOMPurify = require('dompurify')
        return DOMPurify
    } else {
        // Server-side - use a simple regex-based approach for Edge Runtime compatibility
        return null
    }
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
        return ''
    }

    const domPurify = getPurify()

    if (domPurify) {
        // Use DOMPurify when available (client-side)
        return domPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
        })
    } else {
        // Fallback regex-based sanitization for server-side/Edge Runtime
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^>]*>/gi, '')
            .replace(/<object\b[^>]*>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/<link\b[^>]*>/gi, '')
            .replace(/<meta\b[^>]*>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/<(?!\/?(p|br|strong|em|u|ol|ul|li)\b)[^>]*>/gi, '')
    }
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
        return ''
    }

    // Remove any HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '')

    // Trim whitespace
    return cleanText.trim()
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        return ''
    }

    // Convert to lowercase and trim
    const cleanEmail = email.toLowerCase().trim()

    // Remove any potentially dangerous characters
    return cleanEmail.replace(/[<>'"]/g, '')
}

/**
 * Sanitize phone number input
 */
export function sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
        return ''
    }

    // Remove all non-digit characters except + and -
    return phone.replace(/[^\d+\-\s()]/g, '').trim()
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
        return ''
    }

    try {
        const urlObj = new URL(url)

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return ''
        }

        return urlObj.toString()
    } catch {
        return ''
    }
}

/**
 * Sanitize SQL input to prevent injection
 */
export function sanitizeSqlInput(input: string): string {
    if (!input || typeof input !== 'string') {
        return ''
    }

    // Remove SQL injection patterns
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
        /(--|\/\*|\*\/|;)/g,
        /(\b(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(\s*\d+\s*\))/gi,
        /(\b(CAST|CONVERT)\s*\()/gi,
    ]

    let sanitized = input
    sqlPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '')
    })

    return sanitized.trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    if (!obj || typeof obj !== 'object') {
        return {}
    }

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
        const cleanKey = sanitizeText(key)

        if (typeof value === 'string') {
            sanitized[cleanKey] = sanitizeText(value)
        } else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                sanitized[cleanKey] = value.map(item =>
                    typeof item === 'string' ? sanitizeText(item) :
                        typeof item === 'object' ? sanitizeObject(item as Record<string, unknown>) :
                            item
                )
            } else {
                sanitized[cleanKey] = sanitizeObject(value as Record<string, unknown>)
            }
        } else {
            sanitized[cleanKey] = value
        }
    }

    return sanitized
}

/**
 * Validate and sanitize file upload
 */
export interface FileValidationOptions {
    allowedTypes: string[]
    maxSize: number // in bytes
    allowedExtensions: string[]
}

export function validateAndSanitizeFile(
    file: File,
    options: FileValidationOptions
): { isValid: boolean; error?: string; sanitizedName?: string } {
    // Check file size
    if (file.size > options.maxSize) {
        return {
            isValid: false,
            error: `File size exceeds maximum allowed size of ${options.maxSize} bytes`
        }
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
        return {
            isValid: false,
            error: `File type ${file.type} is not allowed`
        }
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !options.allowedExtensions.includes(extension)) {
        return {
            isValid: false,
            error: `File extension .${extension} is not allowed`
        }
    }

    // Sanitize filename
    const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .toLowerCase()

    return {
        isValid: true,
        sanitizedName
    }
}

/**
 * Remove potentially dangerous characters from search queries
 */
export function sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
        return ''
    }

    // Remove SQL injection patterns and script tags
    const sanitized = query
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/[<>'"]/g, '')

    return sanitizeText(sanitized)
}