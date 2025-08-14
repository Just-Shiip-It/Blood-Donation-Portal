import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import { userSchema } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditService } from '@/lib/services/audit'

export async function GET(request: NextRequest) {
    try {
        // Require system admin role for user management
        const authResult = await requireRoles(['system_admin'])

        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')
        const isActive = searchParams.get('isActive')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        const conditions = []

        if (role) {
            conditions.push(eq(userSchema.role, role))
        }
        if (isActive !== null) {
            conditions.push(eq(userSchema.isActive, isActive === 'true'))
        }

        const users = await db
            .select({
                id: userSchema.id,
                email: userSchema.email,
                role: userSchema.role,
                isActive: userSchema.isActive,
                emailVerified: userSchema.emailVerified,
                createdAt: userSchema.createdAt,
                updatedAt: userSchema.updatedAt,
            })
            .from(userSchema)
            .limit(limit)
            .offset(offset)

        return successResponse(users)
    } catch (error) {
        console.error('User management API error:', error)
        return errorResponse('Failed to fetch users', 500)
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Require system admin role for user management
        const authResult = await requireRoles(['system_admin'])

        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const body = await request.json()
        const { userId, updates } = body

        if (!userId) {
            return errorResponse('User ID is required', 400)
        }

        // Get current user data for audit log
        const currentUser = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, userId))
            .limit(1)

        if (currentUser.length === 0) {
            return errorResponse('User not found', 404)
        }

        // Update user
        const updatedUser = await db
            .update(userSchema)
            .set({
                ...updates,
                updatedAt: new Date()
            })
            .where(eq(userSchema.id, userId))
            .returning()

        // Log audit event
        await AuditService.logAudit({
            userId: authResult.user!.id,
            action: 'UPDATE',
            resource: 'users',
            resourceId: userId,
            oldValues: currentUser[0],
            newValues: updatedUser[0],
            metadata: { adminAction: 'user_management' }
        })

        return successResponse(updatedUser[0])
    } catch (error) {
        console.error('User update API error:', error)
        return errorResponse('Failed to update user', 500)
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Require system admin role for user management
        const authResult = await requireRoles(['system_admin'])

        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return errorResponse('User ID is required', 400)
        }

        // Get current user data for audit log
        const currentUser = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, userId))
            .limit(1)

        if (currentUser.length === 0) {
            return errorResponse('User not found', 404)
        }

        // Soft delete by deactivating user
        const updatedUser = await db
            .update(userSchema)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(userSchema.id, userId))
            .returning()

        // Log audit event
        await AuditService.logAudit({
            userId: authResult.user!.id,
            action: 'DELETE',
            resource: 'users',
            resourceId: userId,
            oldValues: currentUser[0],
            newValues: updatedUser[0],
            metadata: { adminAction: 'user_deactivation' }
        })

        return successResponse({ message: 'User deactivated successfully' })
    } catch (error) {
        console.error('User deletion API error:', error)
        return errorResponse('Failed to deactivate user', 500)
    }
}