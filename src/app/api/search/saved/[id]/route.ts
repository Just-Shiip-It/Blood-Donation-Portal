import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { savedSearchSchema } from '../route'
import { eq, and, sql } from 'drizzle-orm'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'
import { z } from 'zod'

const updateSavedSearchSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    isFavorite: z.boolean().optional(),
    useCount: z.number().optional(),
    lastUsed: z.string().optional(), // ISO date string
})

// GET - Retrieve a specific saved search
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const [savedSearch] = await db
            .select({
                id: savedSearchSchema.id,
                name: savedSearchSchema.name,
                description: savedSearchSchema.description,
                criteria: savedSearchSchema.criteria,
                createdAt: savedSearchSchema.createdAt,
                updatedAt: savedSearchSchema.updatedAt,
                isFavorite: savedSearchSchema.isFavorite,
                useCount: savedSearchSchema.useCount,
                lastUsed: savedSearchSchema.lastUsed,
            })
            .from(savedSearchSchema)
            .where(
                and(
                    eq(savedSearchSchema.id, id),
                    eq(savedSearchSchema.userId, user.id)
                )
            )
            .limit(1)

        if (!savedSearch) {
            return errorResponse('Saved search not found', 404)
        }

        return successResponse(savedSearch)
    } catch (error) {
        console.error('Error fetching saved search:', error)
        return serverErrorResponse('Failed to fetch saved search')
    }
}

// PUT - Update a saved search
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const body = await request.json()
        const validatedData = updateSavedSearchSchema.parse(body)

        // Check if the saved search exists and belongs to the user
        const [existingSearch] = await db
            .select({ id: savedSearchSchema.id })
            .from(savedSearchSchema)
            .where(
                and(
                    eq(savedSearchSchema.id, id),
                    eq(savedSearchSchema.userId, user.id)
                )
            )
            .limit(1)

        if (!existingSearch) {
            return errorResponse('Saved search not found', 404)
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
        }

        if (validatedData.name !== undefined) updateData.name = validatedData.name
        if (validatedData.description !== undefined) updateData.description = validatedData.description
        if (validatedData.isFavorite !== undefined) updateData.isFavorite = validatedData.isFavorite
        if (validatedData.useCount !== undefined) updateData.useCount = validatedData.useCount
        if (validatedData.lastUsed !== undefined) updateData.lastUsed = new Date(validatedData.lastUsed)

        // Check for name conflicts if name is being updated
        if (validatedData.name) {
            const [nameConflict] = await db
                .select({ id: savedSearchSchema.id })
                .from(savedSearchSchema)
                .where(
                    and(
                        eq(savedSearchSchema.userId, user.id),
                        eq(savedSearchSchema.name, validatedData.name),
                        // Exclude the current search from the conflict check
                        sql`${savedSearchSchema.id} != ${id}`
                    )
                )
                .limit(1)

            if (nameConflict) {
                return errorResponse('A saved search with this name already exists', 409)
            }
        }

        const [updatedSearch] = await db
            .update(savedSearchSchema)
            .set(updateData)
            .where(
                and(
                    eq(savedSearchSchema.id, id),
                    eq(savedSearchSchema.userId, user.id)
                )
            )
            .returning({
                id: savedSearchSchema.id,
                name: savedSearchSchema.name,
                description: savedSearchSchema.description,
                criteria: savedSearchSchema.criteria,
                createdAt: savedSearchSchema.createdAt,
                updatedAt: savedSearchSchema.updatedAt,
                isFavorite: savedSearchSchema.isFavorite,
                useCount: savedSearchSchema.useCount,
                lastUsed: savedSearchSchema.lastUsed,
            })

        return successResponse(updatedSearch, 'Saved search updated successfully')
    } catch (error) {
        console.error('Error updating saved search:', error)

        if (error instanceof z.ZodError) {
            return errorResponse('Invalid data provided', 400)
        }

        return serverErrorResponse('Failed to update saved search')
    }
}

// DELETE - Delete a saved search
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        // Check if the saved search exists and belongs to the user
        const [existingSearch] = await db
            .select({ id: savedSearchSchema.id })
            .from(savedSearchSchema)
            .where(
                and(
                    eq(savedSearchSchema.id, id),
                    eq(savedSearchSchema.userId, user.id)
                )
            )
            .limit(1)

        if (!existingSearch) {
            return errorResponse('Saved search not found', 404)
        }

        await db
            .delete(savedSearchSchema)
            .where(
                and(
                    eq(savedSearchSchema.id, id),
                    eq(savedSearchSchema.userId, user.id)
                )
            )

        return successResponse(null, 'Saved search deleted successfully')
    } catch (error) {
        console.error('Error deleting saved search:', error)
        return serverErrorResponse('Failed to delete saved search')
    }
}