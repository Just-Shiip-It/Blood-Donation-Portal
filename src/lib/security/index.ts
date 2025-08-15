// Encryption utilities
export {
    encryptData,
    decryptData,
    hashPassword,
    verifyPassword,
    generateSecureToken,
    hashSensitiveData,
    encryptObject,
    decryptObject
} from './encryption'

// Sanitization utilities
export {
    sanitizeHtml,
    sanitizeText,
    sanitizeEmail,
    sanitizePhoneNumber,
    sanitizeUrl,
    sanitizeSqlInput,
    sanitizeObject,
    validateAndSanitizeFile,
    sanitizeSearchQuery
} from './sanitization'

// Rate limiting
export {
    createRateLimit,
    createUserRateLimit,
    createEndpointRateLimit,
    createDDoSProtection,
    AdaptiveRateLimit,
    adaptiveRateLimit,
    RATE_LIMIT_CONFIGS
} from './rate-limiting'

// Security headers
export {
    applySecurityHeaders,
    applyCORSHeaders,
    createSecurityHeadersMiddleware,
    createCORSMiddleware,
    createSecurityMiddleware as createHeadersSecurityMiddleware,
    handlePreflightRequest,
    DEFAULT_SECURITY_HEADERS,
    DEFAULT_CORS_CONFIG
} from './headers'

// Session management
export {
    SessionManager,
    sessionManager,
    createSessionMiddleware,
    setSessionCookie,
    clearSessionCookie,
    SupabaseSessionManager,
    DEFAULT_SESSION_CONFIG
} from './session'

// Enhanced audit logging
export {
    EnhancedAuditService,
    createAuditMiddleware,
    withComplianceLogging
} from './audit-enhanced'

// Input validation
export {
    SecurityValidator,
    createValidationMiddleware,
    createSecurityValidationMiddleware,
    validateFileUpload,
    validateRateLimit,
    DEFAULT_VALIDATION_OPTIONS
} from './validation'

// Comprehensive security middleware
export {
    createSecurityMiddleware,
    createRouteSecurityMiddleware,
    SecurityMiddlewares,
    DEFAULT_SECURITY_CONFIG
} from './middleware'

// Security constants and patterns
export const SECURITY_PATTERNS = {
    SQL_INJECTION: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
        /(--|\/\*|\*\/|;)/g
    ],
    XSS: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
    ],
    PATH_TRAVERSAL: [
        /\.\.\//g,
        /\.\.\\/g,
        /%2e%2e%2f/gi
    ]
} as const

// Security utility functions
export const SecurityUtils = {
    /**
     * Check if a string contains potential security threats
     */
    containsThreats(input: string): boolean {
        const allPatterns = [
            ...SECURITY_PATTERNS.SQL_INJECTION,
            ...SECURITY_PATTERNS.XSS,
            ...SECURITY_PATTERNS.PATH_TRAVERSAL
        ]

        return allPatterns.some(pattern => pattern.test(input))
    },

    /**
     * Get security risk level for input
     */
    getRiskLevel(input: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
        let riskScore = 0

        // Check for SQL injection
        if (SECURITY_PATTERNS.SQL_INJECTION.some(pattern => pattern.test(input))) {
            riskScore += 3
        }

        // Check for XSS
        if (SECURITY_PATTERNS.XSS.some(pattern => pattern.test(input))) {
            riskScore += 2
        }

        // Check for path traversal
        if (SECURITY_PATTERNS.PATH_TRAVERSAL.some(pattern => pattern.test(input))) {
            riskScore += 2
        }

        if (riskScore >= 5) return 'CRITICAL'
        if (riskScore >= 3) return 'HIGH'
        if (riskScore >= 1) return 'MEDIUM'
        return 'LOW'
    },

    /**
     * Generate secure headers for API responses
     */
    getSecureHeaders(): Record<string, string> {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        }
    },

    /**
     * Validate password strength
     */
    validatePasswordStrength(password: string): {
        isStrong: boolean
        score: number
        feedback: string[]
    } {
        const feedback: string[] = []
        let score = 0

        if (password.length >= 8) score += 1
        else feedback.push('Password must be at least 8 characters long')

        if (password.length >= 12) score += 1
        else feedback.push('Consider using 12+ characters for better security')

        if (/[a-z]/.test(password)) score += 1
        else feedback.push('Include lowercase letters')

        if (/[A-Z]/.test(password)) score += 1
        else feedback.push('Include uppercase letters')

        if (/\d/.test(password)) score += 1
        else feedback.push('Include numbers')

        if (/[^a-zA-Z0-9]/.test(password)) score += 1
        else feedback.push('Include special characters')

        if (!/(.)\1{2,}/.test(password)) score += 1
        else feedback.push('Avoid repeating characters')

        return {
            isStrong: score >= 5,
            score,
            feedback
        }
    }
} as const

// Re-export types from modules
export type { FileValidationOptions } from './sanitization'
export type { RateLimitOptions } from './rate-limiting'
export type { SecurityHeadersConfig, CORSConfig } from './headers'
export type { SessionData, SessionConfig } from './session'
export type { SecurityEvent, ComplianceEvent } from './audit-enhanced'
export type { ValidationResult, SecurityValidationOptions } from './validation'
export type { SecurityMiddlewareConfig } from './middleware'