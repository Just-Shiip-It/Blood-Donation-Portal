// Edge Runtime compatible encryption utilities
// Using Web Crypto API instead of Node.js crypto

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

/**
 * Simple base64 encoding for Edge Runtime compatibility
 * Note: This is not secure encryption, just encoding for development
 * In production, implement proper Web Crypto API encryption
 */
export function encryptData(data: string): string {
    try {
        // Simple base64 encoding as placeholder
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data + ENCRYPTION_KEY)
        const base64 = btoa(String.fromCharCode(...dataBuffer))
        return base64
    } catch (error) {
        console.error('Encryption error:', error)
        throw new Error('Failed to encrypt data')
    }
}

/**
 * Simple base64 decoding for Edge Runtime compatibility
 * Note: This is not secure decryption, just decoding for development
 * In production, implement proper Web Crypto API decryption
 */
export function decryptData(encryptedData: string): string {
    try {
        const binaryString = atob(encryptedData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        const decoder = new TextDecoder()
        const decoded = decoder.decode(bytes)

        // Remove the key suffix
        if (decoded.endsWith(ENCRYPTION_KEY)) {
            return decoded.slice(0, -ENCRYPTION_KEY.length)
        }

        throw new Error('Invalid encrypted data')
    } catch (error) {
        console.error('Decryption error:', error)
        throw new Error('Failed to decrypt data')
    }
}

/**
 * Simple password hashing using Web Crypto API
 * Note: This is a basic implementation for Edge Runtime compatibility
 * In production, use a proper password hashing library on the server side
 */
export async function hashPassword(password: string): Promise<string> {
    try {
        // Use Web Crypto API for hashing
        const encoder = new TextEncoder()
        const data = encoder.encode(password + ENCRYPTION_KEY)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        return hashHex
    } catch (error) {
        console.error('Password hashing error:', error)
        throw new Error('Failed to hash password')
    }
}

/**
 * Simple password verification using Web Crypto API
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
        const newHash = await hashPassword(password)
        return newHash === hashedPassword
    } catch (error) {
        console.error('Password verification error:', error)
        return false
    }
}

/**
 * Generate secure random token using Web Crypto API
 */
export function generateSecureToken(length: number = 32): string {
    try {
        const array = new Uint8Array(length)
        crypto.getRandomValues(array)
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    } catch (error) {
        console.error('Token generation error:', error)
        throw new Error('Failed to generate secure token')
    }
}

/**
 * Hash sensitive data for storage (one-way) using Web Crypto API
 */
export async function hashSensitiveData(data: string): Promise<string> {
    try {
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data + ENCRYPTION_KEY)
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
        console.error('Data hashing error:', error)
        throw new Error('Failed to hash data')
    }
}

/**
 * Encrypt object data
 */
export function encryptObject(obj: Record<string, unknown>): string {
    try {
        const jsonString = JSON.stringify(obj)
        return encryptData(jsonString)
    } catch (error) {
        console.error('Object encryption error:', error)
        throw new Error('Failed to encrypt object')
    }
}

/**
 * Decrypt object data
 */
export function decryptObject<T = Record<string, unknown>>(encryptedData: string): T {
    try {
        const decryptedString = decryptData(encryptedData)
        return JSON.parse(decryptedString) as T
    } catch (error) {
        console.error('Object decryption error:', error)
        throw new Error('Failed to decrypt object')
    }
}