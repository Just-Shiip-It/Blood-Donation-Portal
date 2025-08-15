/**
 * Performance budget alert endpoint
 * Handles budget violation alerts from client-side monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const budgetAlertSchema = z.object({
    type: z.enum(['bundle_size', 'long_task', 'image_size', 'memory_usage']),
    actual: z.number(),
    budget: z.number(),
    timestamp: z.number(),
    url: z.string().optional(),
    userAgent: z.string().optional()
});

// In-memory storage for budget alerts
const budgetAlerts: any[] = [];
const MAX_BUDGET_ALERTS = 500;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const alert = budgetAlertSchema.parse(body);

        const enrichedAlert = {
            ...alert,
            id: crypto.randomUUID(),
            clientIP: request.headers.get('x-forwarded-for') || 'unknown',
            receivedAt: Date.now(),
            exceedsBy: ((alert.actual - alert.budget) / alert.budget * 100).toFixed(1) + '%'
        };

        // Store alert
        budgetAlerts.push(enrichedAlert);

        // Keep only recent alerts
        if (budgetAlerts.length > MAX_BUDGET_ALERTS) {
            budgetAlerts.splice(0, budgetAlerts.length - MAX_BUDGET_ALERTS);
        }

        // Log budget violation
        console.warn(`Performance Budget Violation [${alert.type}]:`, {
            actual: alert.actual,
            budget: alert.budget,
            exceedsBy: enrichedAlert.exceedsBy,
            url: alert.url
        });

        return NextResponse.json({
            success: true,
            alertId: enrichedAlert.id
        });

    } catch (error) {
        console.error('Budget alert processing error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process budget alert'
            },
            { status: 400 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '50');

        let filteredAlerts = [...budgetAlerts];

        if (type) {
            filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
        }

        filteredAlerts = filteredAlerts
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        const summary = {
            totalViolations: filteredAlerts.length,
            byType: {} as Record<string, number>,
            avgExcess: 0
        };

        filteredAlerts.forEach(alert => {
            summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
        });

        if (filteredAlerts.length > 0) {
            const totalExcess = filteredAlerts.reduce((sum, alert) => {
                return sum + ((alert.actual - alert.budget) / alert.budget * 100);
            }, 0);
            summary.avgExcess = totalExcess / filteredAlerts.length;
        }

        return NextResponse.json({
            success: true,
            data: {
                alerts: filteredAlerts,
                summary
            }
        });

    } catch (error) {
        console.error('Budget alert retrieval error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve budget alerts'
            },
            { status: 500 }
        );
    }
}