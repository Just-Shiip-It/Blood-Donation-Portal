# Security Implementation Guide

This document outlines the comprehensive security measures implemented in the Blood Donation Portal to protect sensitive health information and ensure compliance with healthcare regulations.

## Overview

The security implementation includes:
- Data encryption for sensitive information
- Input sanitization and SQL injection prevention
- Comprehensive audit logging system
- Session management and security headers
- Rate limiting and DDoS protection
- Security vulnerability assessments

## Security Features

### 1. Data Encryption

**Location**: `src/lib/security/encryption.ts`

- **AES Encryption**: Sensitive data is encrypted using AES encryption
- **Password Hashing**: Passwords are hashed using bcrypt with salt rounds
- **Secure Token Generation**: Cryptographically secure tokens for sessions and verification
- **Data Hashing**: One-way hashing for sensitive data storage

```typescript
import { encryptData, decryptData, hashPassword } from '@/lib/security'

// Encrypt sensitive data
const encrypted = encryptData('sensitive information')

// Hash passwords
const hashedPassword = await hashPassword('userPassword123')
```

### 2. Input Sanitization

**Location**: `src/lib/security/sanitization.ts`

- **HTML Sanitization**: Removes dangerous HTML tags and scripts
- **SQL Injection Prevention**: Detects and removes SQL injection patterns
- **XSS Protection**: Sanitizes input to prevent cross-site scripting
- **File Upload Validation**: Validates file types, sizes, and names

```typescript
import { sanitizeHtml, sanitizeText, validateAndSanitizeFile } from '@/lib/security'

// Sanitize user input
const cleanHtml = sanitizeHtml(userInput)
const cleanText = sanitizeText(userInput)

// Validate file uploads
const fileResult = validateAndSanitizeFile(file, {
    allowedTypes: ['image/jpeg', 'image/png'],
    maxSize: 5242880, // 5MB
    allowedExtensions: ['jpg', 'png']
})
```

### 3. Rate Limiting

**Location**: `src/lib/security/rate-limiting.ts`

- **Adaptive Rate Limiting**: Adjusts limits based on user behavior
- **Endpoint-Specific Limits**: Different limits for different API endpoints
- **DDoS Protection**: Detects and blocks potential DDoS attacks
- **IP-Based Tracking**: Monitors requests per IP address

```typescript
import { createRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security'

// Create rate limiter for authentication endpoints
const authRateLimit = createRateLimit(RATE_LIMIT_CONFIGS.auth)
```

### 4. Security Headers

**Location**: `src/lib/security/headers.ts`

- **Content Security Policy**: Prevents XSS attacks
- **HSTS**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking
- **CORS Configuration**: Controls cross-origin requests

```typescript
import { applySecurityHeaders, DEFAULT_SECURITY_HEADERS } from '@/lib/security'

// Apply security headers to response
applySecurityHeaders(response, DEFAULT_SECURITY_HEADERS)
```

### 5. Session Management

**Location**: `src/lib/security/session.ts`

- **Secure Session Storage**: Encrypted session data
- **Session Expiration**: Automatic session timeout
- **Concurrent Session Limits**: Limits multiple sessions per user
- **IP Address Validation**: Detects session hijacking attempts

```typescript
import { SessionManager, sessionManager } from '@/lib/security'

// Create new session
const sessionId = await sessionManager.createSession(userId, userRole, email, request)

// Validate existing session
const session = await sessionManager.validateSession(sessionId, request)
```

### 6. Enhanced Audit Logging

**Location**: `src/lib/security/audit-enhanced.ts`

- **Security Event Logging**: Tracks security-related events
- **Compliance Logging**: HIPAA/GDPR compliance tracking
- **Anomaly Detection**: Identifies suspicious patterns
- **Audit Reports**: Generates compliance reports

```typescript
import { EnhancedAuditService } from '@/lib/security'

// Log security event
await EnhancedAuditService.logSecurityEvent({
    type: 'AUTHENTICATION',
    severity: 'MEDIUM',
    action: 'LOGIN_FAILURE',
    resource: 'auth',
    userId,
    ipAddress,
    userAgent,
    details: { reason: 'Invalid credentials' }
})

// Log compliance event
await EnhancedAuditService.logComplianceEvent({
    eventType: 'DATA_ACCESS',
    dataType: 'PHI',
    userId,
    dataSubject: patientId,
    purpose: 'Medical record review'
})
```

### 7. Input Validation

**Location**: `src/lib/security/validation.ts`

- **Security Pattern Detection**: Identifies malicious patterns
- **Schema Validation**: Validates data against Zod schemas
- **File Upload Security**: Validates uploaded files
- **Threat Assessment**: Assigns risk levels to inputs

```typescript
import { SecurityValidator, createValidationMiddleware } from '@/lib/security'

// Create validator
const validator = new SecurityValidator({
    checkSqlInjection: true,
    checkXss: true,
    checkPathTraversal: true,
    sanitizeInput: true
})

// Validate input
const result = validator.validateInput(userInput)
```

## Security Middleware

**Location**: `src/lib/security/middleware.ts`

The comprehensive security middleware combines all security features:

```typescript
import { SecurityMiddlewares } from '@/lib/security'

// Apply to API routes
export async function POST(request: NextRequest) {
    const securityResponse = await SecurityMiddlewares.api(request)
    if (securityResponse.status !== 200) {
        return securityResponse
    }
    // Continue with business logic
}
```

### Pre-configured Middleware

- **`SecurityMiddlewares.api`**: Standard API security
- **`SecurityMiddlewares.auth`**: Authentication endpoint security
- **`SecurityMiddlewares.admin`**: Admin endpoint security
- **`SecurityMiddlewares.upload`**: File upload security
- **`SecurityMiddlewares.public`**: Public endpoint security

## Configuration

### Environment Variables

```bash
# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key_here
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# Rate Limiting
ENABLE_RATE_LIMITING=true
ENABLE_DDOS_PROTECTION=true

# Security Headers
ENABLE_SECURITY_HEADERS=true
CSP_REPORT_URI=https://your-domain.report-uri.com/r/d/csp/enforce

# Audit Logging
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_LEVEL=INFO
SECURITY_ALERT_EMAIL=security@your-domain.com
```

### Next.js Configuration

Security headers are configured in `next.config.ts`:

```typescript
async headers() {
    return [
        {
            source: '/(.*)',
            headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-XSS-Protection', value: '1; mode=block' },
                // ... more headers
            ]
        }
    ]
}
```

## Compliance Features

### HIPAA Compliance

- **Data Encryption**: All PHI is encrypted at rest and in transit
- **Access Controls**: Role-based access to sensitive data
- **Audit Logging**: Comprehensive logging of PHI access
- **Data Retention**: Configurable data retention policies

### GDPR Compliance

- **Consent Management**: Tracks user consent for data processing
- **Data Subject Rights**: Supports data export and deletion
- **Legal Basis Tracking**: Records legal basis for data processing
- **Privacy by Design**: Security built into the system architecture

## Security Testing

### Running Security Tests

```bash
# Run all security tests
npm run test:run -- src/lib/security/__tests__/security.test.ts

# Run with coverage
npm run test:coverage -- src/lib/security/
```

### Test Coverage

The security tests cover:
- Encryption and decryption
- Input sanitization
- SQL injection detection
- XSS prevention
- Rate limiting
- Session management
- Audit logging

## Security Monitoring

### Audit Dashboard

Access audit logs and security events:
- `/admin/audit` - View audit logs
- `/admin/security` - Security dashboard
- `/admin/reports` - Compliance reports

### Security Alerts

The system automatically alerts on:
- Failed authentication attempts
- SQL injection attempts
- XSS attacks
- Rate limit violations
- Suspicious user behavior

## Best Practices

### For Developers

1. **Always validate input**: Use the security validation middleware
2. **Sanitize output**: Sanitize data before displaying to users
3. **Use parameterized queries**: Prevent SQL injection
4. **Implement proper error handling**: Don't expose sensitive information
5. **Log security events**: Use the audit service for tracking

### For Administrators

1. **Monitor audit logs**: Regularly review security events
2. **Update security configurations**: Keep security settings current
3. **Review user permissions**: Ensure proper role-based access
4. **Backup encryption keys**: Securely store encryption keys
5. **Test security measures**: Regularly test security implementations

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor audit logs and security alerts
2. **Assessment**: Evaluate the severity and impact
3. **Containment**: Implement immediate protective measures
4. **Investigation**: Analyze logs and determine root cause
5. **Recovery**: Restore normal operations
6. **Documentation**: Document the incident and lessons learned

### Emergency Contacts

- **Security Team**: security@your-domain.com
- **System Administrator**: admin@your-domain.com
- **Compliance Officer**: compliance@your-domain.com

## Updates and Maintenance

### Security Updates

- Regularly update dependencies
- Monitor security advisories
- Apply security patches promptly
- Review and update security configurations

### Security Audits

- Conduct regular security assessments
- Perform penetration testing
- Review access controls
- Update security documentation

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [GDPR Guidelines](https://gdpr.eu/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

For questions or security concerns, contact the security team at security@your-domain.com.