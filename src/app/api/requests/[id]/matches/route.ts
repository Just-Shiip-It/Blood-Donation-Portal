import { NextRequest } from 'next/server'
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response'
import { requireRoles } from '@/lib/auth/utils'
import {
    getBloodRequestById,
    findInventoryMatches
} from '@/lib/services/blood-request'
import { getHealthcareFacilityById } from '@/lib/services/healthcare-facility'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/requests/[id]/matches - Find inventory matches for a blood request
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Require admin or system admin role
        const authResult = await requireRoles(['admin', 'system_admin'])
        if (!authResult.success) {
            return errorResponse(authResult.error!, 401)
        }

        // Get blood request
        const bloodRequest = await getBloodRequestById(id)
        if (!bloodRequest) {
            return notFoundResponse('Blood request not found')
        }

        // Only find matches for pending requests
        if (bloodRequest.status !== 'pending') {
            return errorResponse('Can only find matches for pending requests', 400)
        }

        // Get facility coordinates for distance calculation
        let facilityCoordinates: { lat: number; lng: number } | undefined

        try {
            const facility = await getHealthcareFacilityById(bloodRequest.facilityId)
            if (facility?.coordinates && typeof facility.coordinates === 'object' &&
                'lat' in facility.coordinates && 'lng' in facility.coordinates &&
                typeof facility.coordinates.lat === 'number' && typeof facility.coordinates.lng === 'number') {
                facilityCoordinates = {
                    lat: facility.coordinates.lat,
                    lng: facility.coordinates.lng
                }
            }
        } catch (error) {
            console.warn('Could not get facility coordinates:', error)
            // Continue without coordinates - matches will still work
        }

        // Find inventory matches
        const matches = await findInventoryMatches(
            bloodRequest.bloodType,
            bloodRequest.unitsRequested,
            facilityCoordinates
        )

        return successResponse({
            requestId: id,
            bloodType: bloodRequest.bloodType,
            unitsRequested: bloodRequest.unitsRequested,
            urgencyLevel: bloodRequest.urgencyLevel,
            matches
        })
    } catch (error) {
        console.error('Find inventory matches error:', error)
        return errorResponse('Failed to find inventory matches', 500)
    }
}