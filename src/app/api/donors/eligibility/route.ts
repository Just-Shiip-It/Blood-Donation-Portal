import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { donorProfileSchema, userSchema } from '@/lib/db/schema'
import { DonorEligibilityService } from '@/lib/services/eligibility'
import { DonorProfile } from '@/lib/validations/donor'
import { eq } from 'drizzle-orm'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized' } },
                { status: 401 }
            )
        }

        // Verify user is a donor
        const userData = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (userData.length === 0 || userData[0].role !== 'donor') {
            return NextResponse.json(
                { success: false, error: { message: 'Access denied' } },
                { status: 403 }
            )
        }

        // Get donor profile
        const donorData = await db
            .select()
            .from(donorProfileSchema)
            .where(eq(donorProfileSchema.userId, user.id))
            .limit(1)

        if (donorData.length === 0) {
            return NextResponse.json(
                { success: false, error: { message: 'Donor profile not found' } },
                { status: 404 }
            )
        }

        const donorProfile = donorData[0]

        // Check eligibility
        const eligibilityResult = DonorEligibilityService.checkEligibility(
            donorProfile as DonorProfile,
            donorProfile.lastDonationDate || undefined
        )

        const eligibilitySummary = DonorEligibilityService.getEligibilitySummary(
            donorProfile as DonorProfile,
            donorProfile.lastDonationDate || undefined
        )

        return NextResponse.json({
            success: true,
            data: {
                eligibility: {
                    isEligible: eligibilityResult.isEligible,
                    status: eligibilitySummary.status,
                    message: eligibilitySummary.message,
                    nextEligibleDate: eligibilitySummary.nextEligibleDate?.toISOString(),
                    reasons: eligibilityResult.reasons,
                    temporaryDeferrals: eligibilityResult.temporaryDeferrals.map(d => ({
                        reason: d.reason,
                        until: d.until.toISOString(),
                        notes: d.notes
                    })),
                    permanentDeferrals: eligibilityResult.permanentDeferrals
                },
                profile: {
                    totalDonations: donorProfile.totalDonations,
                    lastDonationDate: donorProfile.lastDonationDate,
                    isDeferredTemporary: donorProfile.isDeferredTemporary,
                    isDeferredPermanent: donorProfile.isDeferredPermanent,
                    deferralReason: donorProfile.deferralReason,
                    deferralEndDate: donorProfile.deferralEndDate
                }
            }
        })

    } catch (error) {
        console.error('Get eligibility error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Internal server error' } },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized' } },
                { status: 401 }
            )
        }

        // Verify user is a donor
        const userData = await db
            .select()
            .from(userSchema)
            .where(eq(userSchema.id, user.id))
            .limit(1)

        if (userData.length === 0 || userData[0].role !== 'donor') {
            return NextResponse.json(
                { success: false, error: { message: 'Access denied' } },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { lastDonationDate } = body

        // Get donor profile
        const donorData = await db
            .select()
            .from(donorProfileSchema)
            .where(eq(donorProfileSchema.userId, user.id))
            .limit(1)

        if (donorData.length === 0) {
            return NextResponse.json(
                { success: false, error: { message: 'Donor profile not found' } },
                { status: 404 }
            )
        }

        const donorProfile = donorData[0]

        // Check eligibility with provided last donation date
        const eligibilityResult = DonorEligibilityService.checkEligibility(
            donorProfile as DonorProfile,
            lastDonationDate || donorProfile.lastDonationDate || undefined
        )

        const eligibilitySummary = DonorEligibilityService.getEligibilitySummary(
            donorProfile as DonorProfile,
            lastDonationDate || donorProfile.lastDonationDate || undefined
        )

        return NextResponse.json({
            success: true,
            data: {
                eligibility: {
                    isEligible: eligibilityResult.isEligible,
                    status: eligibilitySummary.status,
                    message: eligibilitySummary.message,
                    nextEligibleDate: eligibilitySummary.nextEligibleDate?.toISOString(),
                    reasons: eligibilityResult.reasons,
                    temporaryDeferrals: eligibilityResult.temporaryDeferrals.map(d => ({
                        reason: d.reason,
                        until: d.until.toISOString(),
                        notes: d.notes
                    })),
                    permanentDeferrals: eligibilityResult.permanentDeferrals
                }
            }
        })

    } catch (error) {
        console.error('Check eligibility error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Internal server error' } },
            { status: 500 }
        )
    }
}