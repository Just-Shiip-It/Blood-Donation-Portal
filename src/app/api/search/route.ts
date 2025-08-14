import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SearchService } from '@/lib/services/search'
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'
import { z } from 'zod'

// Search request validation schema
const searchRequestSchema = z.object({
    // Search criteria
    query: z.string().optional(),
    category: z.enum(['appointments', 'blood-banks', 'requests', 'donations']).optional(),
    bloodType: z.string().optional(),
    status: z.string().optional(),
    urgencyLevel: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),

    // Location data
    location: z.object({
        address: z.string(),
        coordinates: z.object({
            lat: z.number(),
            lng: z.number(),
        }).optional(),
        radius: z.number().min(1).max(100),
    }).optional(),

    // Filters
    filters: z.record(z.string(), z.unknown()).optional(),

    // Pagination
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),

    // Sorting
    sortBy: z.string().default('relevance'),
    sortDirection: z.enum(['asc', 'desc']).default('desc'),
})

type SearchData = {
    query?: string
    category?: string
    bloodType?: string
    status?: string
    urgencyLevel?: string
    dateFrom?: string
    dateTo?: string
    page: number
    pageSize: number
    sortBy: string
    sortDirection: string
    location?: unknown
    filters?: unknown
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const { searchParams } = new URL(request.url)

        // Parse query parameters
        const searchData: SearchData = {
            query: searchParams.get('q') || undefined,
            category: searchParams.get('category') || undefined,
            bloodType: searchParams.get('bloodType') || undefined,
            status: searchParams.get('status') || undefined,
            urgencyLevel: searchParams.get('urgencyLevel') || undefined,
            dateFrom: searchParams.get('dateFrom') || undefined,
            dateTo: searchParams.get('dateTo') || undefined,
            page: parseInt(searchParams.get('page') || '1'),
            pageSize: parseInt(searchParams.get('pageSize') || '20'),
            sortBy: searchParams.get('sortBy') || 'relevance',
            sortDirection: searchParams.get('sortDirection') || 'desc',
        }

        // Parse location data if provided
        const locationParam = searchParams.get('location')
        if (locationParam) {
            try {
                searchData.location = JSON.parse(locationParam)
            } catch {
                return errorResponse('Invalid location data format')
            }
        }

        // Parse filters if provided
        const filtersParam = searchParams.get('filters')
        if (filtersParam) {
            try {
                searchData.filters = JSON.parse(filtersParam)
            } catch {
                return errorResponse('Invalid filters data format')
            }
        }

        // Validate the search request
        const validatedData = searchRequestSchema.parse(searchData)

        // Perform the search
        const searchOptions = {
            criteria: {
                query: validatedData.query,
                category: validatedData.category,
                bloodType: validatedData.bloodType,
                status: validatedData.status,
                urgencyLevel: validatedData.urgencyLevel,
                dateFrom: validatedData.dateFrom,
                dateTo: validatedData.dateTo,
            },
            location: validatedData.location,
            filters: validatedData.filters,
            page: validatedData.page,
            pageSize: validatedData.pageSize,
            sortBy: validatedData.sortBy,
            sortDirection: validatedData.sortDirection as 'asc' | 'desc',
        }

        const results = await SearchService.search(searchOptions)

        return successResponse(results)
    } catch (error) {
        console.error('Search error:', error)

        if (error instanceof z.ZodError) {
            return errorResponse('Invalid search parameters', 400)
        }

        if (error instanceof Error) {
            return errorResponse(error.message)
        }

        return serverErrorResponse('Search failed')
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return unauthorizedResponse('Authentication required')
        }

        const body = await request.json()
        const validatedData = searchRequestSchema.parse(body)

        // Perform the search
        const searchOptions = {
            criteria: {
                query: validatedData.query,
                category: validatedData.category,
                bloodType: validatedData.bloodType,
                status: validatedData.status,
                urgencyLevel: validatedData.urgencyLevel,
                dateFrom: validatedData.dateFrom,
                dateTo: validatedData.dateTo,
            },
            location: validatedData.location,
            filters: validatedData.filters,
            page: validatedData.page,
            pageSize: validatedData.pageSize,
            sortBy: validatedData.sortBy,
            sortDirection: validatedData.sortDirection as 'asc' | 'desc',
        }

        const results = await SearchService.search(searchOptions)

        return successResponse(results)
    } catch (error) {
        console.error('Search error:', error)

        if (error instanceof z.ZodError) {
            return errorResponse('Invalid search parameters', 400)
        }

        if (error instanceof Error) {
            return errorResponse(error.message)
        }

        return serverErrorResponse('Search failed')
    }
}