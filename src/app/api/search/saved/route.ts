import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { userSchema } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'
import { z } from 'zod'
import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

// Saved searches schema
export const savedSearchSchema = pgTable('saved_searches', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => userSchema.id).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    criteria: jsonb('criteria').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    isFavorite: boolean('is_favorite').default(false),
    useCount: integer('use_count').default(0),
    lastUsed: timestamp('last_used'),
})

// Validation schemas
const createSavedSearchSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    criteria: z.object({
        query: z.string().optional(),
        category: z.enum(['appointments', 'blood-banks', 'requests', 'donations']).optional(),
        bloodType: z.string().optional(),
        status: z.string().optional(),
        urgencyLevel: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        location: z.string().optional(),
        radius: z.number().optional(),
    }),
})

// GET - Retrieve all saved searches for the user
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const savedSearches = await db
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
            .where(eq(savedSearchSchema.userId, user.id))
            .orderBy(desc(savedSearchSchema.updatedAt))

        return successResponse(savedSearches)
    } catch (error) {
        console.error('Error fetching saved searches:', error)
        return serverErrorResponse('Failed to fetch saved searches')
    }
}

// POST - Create a new saved search
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const body = await request.json()
        const validatedData = createSavedSearchSchema.parse(body)

        // Check if a search with the same name already exists for this user
        const existingSearch = await db
            .select({ id: savedSearchSchema.id })
            .from(savedSearchSchema)
            .where(
                and(
                    eq(savedSearchSchema.userId, user.id),
                    eq(savedSearchSchema.name, validatedData.name)
                )
            )
            .limit(1)

        if (existingSearch.length > 0) {
            return errorResponse('A saved search with this name already exists', 409)
        }

        const [newSearch] = await db
            .insert(savedSearchSchema)
            .values({
                userId: user.id,
                name: validatedData.name,
                description: validatedData.description,
                criteria: validatedData.criteria,
            })
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

        return successResponse(newSearch, 'Saved search created successfully')
    } catch (error) {
        console.error('Error creating saved search:', error)

        if (error instanceof z.ZodError) {
            return errorResponse('Invalid data provided', 400)
        }

        return serverErrorResponse('Failed to create saved search')
    }
}