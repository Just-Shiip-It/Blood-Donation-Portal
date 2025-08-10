import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DonationHistoryService, type DonationRecord } from '@/lib/services/donation-history'
import { exportDonationHistorySchema } from '@/lib/validations/donation-history'
import { errorResponse, validationErrorResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return unauthorizedResponse()
        }

        const { searchParams } = new URL(request.url)
        const queryParams = Object.fromEntries(searchParams.entries())

        const validationResult = exportDonationHistorySchema.safeParse(queryParams)
        if (!validationResult.success) {
            return validationErrorResponse(validationResult.error.flatten().fieldErrors)
        }

        const query = validationResult.data

        // Get user role to determine access permissions
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData) {
            return errorResponse('User not found', 404)
        }

        // Role-based access control
        if (userData.role === 'donor') {
            // Donors can only export their own donation history
            const { data: donorProfile } = await supabase
                .from('donor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!donorProfile) {
                return errorResponse('Donor profile not found', 404)
            }

            query.donorId = donorProfile.id
        } else if (userData.role === 'admin') {
            // Blood bank admins can export donations for their blood bank
            const { data: bloodBankProfile } = await supabase
                .from('blood_bank_profiles')
                .select('blood_bank_id')
                .eq('user_id', user.id)
                .single()

            if (bloodBankProfile && !query.donorId) {
                // If no specific donor requested, filter by blood bank
                const historyQuery = {
                    bloodBankId: bloodBankProfile.blood_bank_id,
                    startDate: query.startDate,
                    endDate: query.endDate,
                    page: 1,
                    limit: 10000, // Large limit for export
                    sortBy: 'donationDate' as const,
                    sortOrder: 'desc' as const
                }

                const result = await DonationHistoryService.getDonationHistory(historyQuery)
                return generateExportResponse(result.donations, query.format, query.includeHealthMetrics, query.includeNotes)
            }
        } else if (userData.role !== 'system_admin') {
            return errorResponse('Access denied', 403)
        }

        // Get donation history for export
        const historyQuery = {
            donorId: query.donorId,
            startDate: query.startDate,
            endDate: query.endDate,
            page: 1,
            limit: 10000, // Large limit for export
            sortBy: 'donationDate' as const,
            sortOrder: 'desc' as const
        }

        const result = await DonationHistoryService.getDonationHistory(historyQuery)

        return generateExportResponse(result.donations, query.format, query.includeHealthMetrics, query.includeNotes)

    } catch (error) {
        console.error('Export donation history error:', error)
        return serverErrorResponse()
    }
}

function generateExportResponse(
    donations: DonationRecord[],
    format: 'csv' | 'pdf' | 'json',
    includeHealthMetrics: boolean,
    includeNotes: boolean
) {
    const timestamp = new Date().toISOString().split('T')[0]

    switch (format) {
        case 'csv':
            return generateCSVResponse(donations, includeHealthMetrics, includeNotes, timestamp)
        case 'json':
            return generateJSONResponse(donations, includeHealthMetrics, includeNotes, timestamp)
        case 'pdf':
            // For now, return JSON with a note about PDF generation
            return NextResponse.json({
                success: false,
                error: 'PDF export not yet implemented. Please use CSV or JSON format.'
            }, { status: 501 })
        default:
            return NextResponse.json({
                success: false,
                error: 'Invalid export format'
            }, { status: 400 })
    }
}

function generateCSVResponse(donations: DonationRecord[], includeHealthMetrics: boolean, includeNotes: boolean, timestamp: string) {
    const headers = [
        'Donation Date',
        'Blood Type',
        'Units Collected',
        'Blood Bank',
        'Donor Name'
    ]

    if (includeHealthMetrics) {
        headers.push('Hemoglobin', 'Blood Pressure', 'Pulse', 'Weight', 'Temperature')
    }

    if (includeNotes) {
        headers.push('Notes')
    }

    const csvRows = [headers.join(',')]

    donations.forEach(donation => {
        const row = [
            donation.donationDate.toISOString().split('T')[0],
            donation.bloodType,
            donation.unitsCollected.toString(),
            donation.bloodBank?.name || 'N/A',
            `"${donation.donor?.firstName || ''} ${donation.donor?.lastName || ''}"`
        ]

        if (includeHealthMetrics) {
            const metrics = donation.healthMetrics as Record<string, unknown> || {}
            const bloodPressure = metrics.bloodPressure as { systolic?: number; diastolic?: number } | undefined
            row.push(
                (metrics.hemoglobin as number)?.toString() || '',
                bloodPressure ? `${bloodPressure.systolic}/${bloodPressure.diastolic}` : '',
                (metrics.pulse as number)?.toString() || '',
                (metrics.weight as number)?.toString() || '',
                (metrics.temperature as number)?.toString() || ''
            )
        }

        if (includeNotes) {
            row.push(`"${donation.notes || ''}"`)
        }

        csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="donation-history-${timestamp}.csv"`
        }
    })
}

function generateJSONResponse(donations: DonationRecord[], includeHealthMetrics: boolean, includeNotes: boolean, timestamp: string) {
    const exportData = donations.map(donation => {
        const record: Record<string, unknown> = {
            id: donation.id,
            donationDate: donation.donationDate.toISOString().split('T')[0],
            bloodType: donation.bloodType,
            unitsCollected: donation.unitsCollected,
            bloodBank: donation.bloodBank,
            donor: donation.donor,
            createdAt: donation.createdAt
        }

        if (includeHealthMetrics) {
            record.healthMetrics = donation.healthMetrics
        }

        if (includeNotes) {
            record.notes = donation.notes
        }

        return record
    })

    const jsonContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalRecords: donations.length,
        donations: exportData
    }, null, 2)

    return new NextResponse(jsonContent, {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="donation-history-${timestamp}.json"`
        }
    })
}