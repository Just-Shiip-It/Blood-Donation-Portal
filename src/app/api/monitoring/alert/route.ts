/**
 * Performance monitoring alert endpoint
 * Receives and processes performance alerts from client-side monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const alertSchema = z.object({
    type: z.enum(['performance', 'slow_api', 'high_memory', 'bundle_size', 'long_task']),
    metric: z.string().optional(),
    value: z.number(),
    threshold: z.number().optional(),
    url: z.string().optional(),
    method: z.string().optional(),
    duration: z.number().optional(),
    usage: z.number().optional(),
    actual: z.number().optional(),
    budget: z.number().optional(),
    timestamp: z.number(),
    userAgent: z.string().optional()
});

// In-memory storage for alerts (in production, use a proper database)
const alerts: any[] = [];
const MAX_ALERTS = 1000;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const alert = alertSchema.parse(body);

        // Add client IP and additional metadata
        const clientIP = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        const enrichedAlert = {
            ...alert,
            id: crypto.randomUUID(),
            clientIP,
            receivedAt: Date.now(),
            severity: determineSeverity(alert)
        };

        // Store alert
        alerts.push(enrichedAlert);

        // Keep only recent alerts
        if (alerts.length > MAX_ALERTS) {
            alerts.splice(0, alerts.length - MAX_ALERTS);
        }

        // Process alert based on severity
        await processAlert(enrichedAlert);

        return NextResponse.json({
            success: true,
            alertId: enrichedAlert.id
        });

    } catch (error) {
        console.error('Alert processing error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process alert'
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
        const since = searchParams.get('since');

        let filteredAlerts = [...alerts];

        // Filter by type
        if (type) {
            filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
        }

        // Filter by time
        if (since) {
            const sinceTimestamp = parseInt(since);
            filteredAlerts = filteredAlerts.filter(alert => alert.timestamp >= sinceTimestamp);
        }

        // Sort by timestamp (newest first) and limit
        filteredAlerts = filteredAlerts
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        // Generate summary statistics
        const summary = generateAlertSummary(filteredAlerts);

        return NextResponse.json({
            success: true,
            data: {
                alerts: filteredAlerts,
                summary,
                total: filteredAlerts.length
            }
        });

    } catch (error) {
        console.error('Alert retrieval error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve alerts'
            },
            { status: 500 }
        );
    }
}

function determineSeverity(alert: any): 'low' | 'medium' | 'high' | 'critical' {
    switch (alert.type) {
        case 'performance':
            if (alert.metric === 'LCP' && alert.value > 4000) return 'critical';
            if (alert.metric === 'FID' && alert.value > 300) return 'critical';
            if (alert.metric === 'CLS' && alert.value > 0.25) return 'critical';
            return 'high';

        case 'slow_api':
            if (alert.duration > 5000) return 'critical';
            if (alert.duration > 3000) return 'high';
            return 'medium';

        case 'high_memory':
            if (alert.usage > 100) return 'critical'; // >100MB
            if (alert.usage > 75) return 'high';      // >75MB
            return 'medium';

        case 'bundle_size':
            if (alert.actual > alert.budget * 1.5) return 'high';
            return 'medium';

        case 'long_task':
            if (alert.value > 200) return 'high';     // >200ms
            if (alert.value > 100) return 'medium';   // >100ms
            return 'low';

        default:
            return 'low';
    }
}

async function processAlert(alert: any): Promise<void> {
    // Log alert
    console.log(`Performance Alert [${alert.severity.toUpperCase()}]:`, {
        type: alert.type,
        value: alert.value,
        url: alert.url,
        timestamp: new Date(alert.timestamp).toISOString()
    });

    // For critical alerts, you might want to:
    // - Send notifications to administrators
    // - Trigger automated responses
    // - Update monitoring dashboards

    if (alert.severity === 'critical') {
        await handleCriticalAlert(alert);
    }
}

async function handleCriticalAlert(alert: any): Promise<void> {
    // In a real application, you might:
    // - Send email/SMS notifications
    // - Post to Slack/Teams
    // - Trigger incident management workflows
    // - Scale infrastructure automatically

    console.warn('CRITICAL PERFORMANCE ALERT:', alert);

    // Example: Log to external monitoring service
    try {
        // await notificationService.sendCriticalAlert(alert);
    } catch (error) {
        console.error('Failed to send critical alert notification:', error);
    }
}

function generateAlertSummary(alerts: any[]) {
    const summary = {
        totalAlerts: alerts.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        avgResponseTime: 0,
        criticalCount: 0,
        recentTrend: 'stable' as 'improving' | 'stable' | 'degrading'
    };

    // Count by type and severity
    alerts.forEach(alert => {
        summary.byType[alert.type] = (summary.byType[alert.type] || 0) + 1;
        summary.bySeverity[alert.severity] = (summary.bySeverity[alert.severity] || 0) + 1;

        if (alert.severity === 'critical') {
            summary.criticalCount++;
        }
    });

    // Calculate average response time for API alerts
    const apiAlerts = alerts.filter(alert => alert.type === 'slow_api');
    if (apiAlerts.length > 0) {
        summary.avgResponseTime = apiAlerts.reduce((sum, alert) => sum + alert.duration, 0) / apiAlerts.length;
    }

    // Determine trend (simplified - compare last hour vs previous hour)
    const now = Date.now();
    const lastHour = alerts.filter(alert => alert.timestamp > now - 3600000);
    const previousHour = alerts.filter(alert =>
        alert.timestamp > now - 7200000 && alert.timestamp <= now - 3600000
    );

    if (lastHour.length > previousHour.length * 1.2) {
        summary.recentTrend = 'degrading';
    } else if (lastHour.length < previousHour.length * 0.8) {
        summary.recentTrend = 'improving';
    }

    return summary;
}