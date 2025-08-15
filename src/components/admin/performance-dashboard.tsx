/**
 * Performance monitoring dashboard component
 * Displays real-time performance metrics and alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    Gauge,
    MemoryStick,
    Monitor,
    TrendingUp,
    Zap
} from 'lucide-react';

interface PerformanceMetrics {
    webVitals: {
        LCP?: { avg: number; p95: number; count: number };
        FID?: { avg: number; p95: number; count: number };
        CLS?: { avg: number; p95: number; count: number };
    };
    apiPerformance: Record<string, {
        totalRequests: number;
        avgDuration: number;
        p95Duration: number;
        successRate: number;
        slowRequests: number;
    }>;
    systemResources: {
        current: number;
        avg: number;
        max: number;
        samples: number;
    } | null;
    timestamp: number;
}

interface Alert {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    value: number;
    threshold?: number;
    timestamp: number;
    url?: string;
}

export function PerformanceDashboard() {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchMetrics();
        fetchAlerts();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchMetrics();
                fetchAlerts();
            }, 30000); // Refresh every 30 seconds

            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchMetrics = async () => {
        try {
            // In a real implementation, this would fetch from your performance monitoring API
            const mockMetrics: PerformanceMetrics = {
                webVitals: {
                    LCP: { avg: 2100, p95: 2800, count: 150 },
                    FID: { avg: 85, p95: 120, count: 150 },
                    CLS: { avg: 0.08, p95: 0.15, count: 150 }
                },
                apiPerformance: {
                    'GET /api/bloodbanks': {
                        totalRequests: 245,
                        avgDuration: 180,
                        p95Duration: 320,
                        successRate: 98.8,
                        slowRequests: 3
                    },
                    'POST /api/appointments': {
                        totalRequests: 89,
                        avgDuration: 250,
                        p95Duration: 450,
                        successRate: 99.1,
                        slowRequests: 1
                    },
                    'GET /api/donors/profile': {
                        totalRequests: 156,
                        avgDuration: 120,
                        p95Duration: 200,
                        successRate: 99.4,
                        slowRequests: 0
                    }
                },
                systemResources: {
                    current: 45 * 1024 * 1024, // 45MB
                    avg: 38 * 1024 * 1024,     // 38MB
                    max: 52 * 1024 * 1024,     // 52MB
                    samples: 120
                },
                timestamp: Date.now()
            };

            setMetrics(mockMetrics);
        } catch (error) {
            console.error('Failed to fetch performance metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await fetch('/api/monitoring/alert?limit=20');
            if (response.ok) {
                const data = await response.json();
                setAlerts(data.data.alerts || []);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        }
    };

    const exportReport = async () => {
        try {
            // Import the performance dashboard utility
            const { PerformanceDashboard } = await import('@/lib/performance/monitoring');
            await PerformanceDashboard.exportReport();
        } catch (error) {
            console.error('Failed to export report:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'high': return 'destructive';
            case 'medium': return 'default';
            case 'low': return 'secondary';
            default: return 'secondary';
        }
    };

    const getWebVitalStatus = (metric: string, value: number) => {
        const thresholds = {
            LCP: { good: 2500, poor: 4000 },
            FID: { good: 100, poor: 300 },
            CLS: { good: 0.1, poor: 0.25 }
        };

        const threshold = thresholds[metric as keyof typeof thresholds];
        if (!threshold) return 'unknown';

        if (value <= threshold.good) return 'good';
        if (value <= threshold.poor) return 'needs-improvement';
        return 'poor';
    };

    const formatBytes = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Performance Dashboard</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Performance Dashboard</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        {autoRefresh ? (
                            <>
                                <Activity className="h-4 w-4 mr-2" />
                                Auto Refresh On
                            </>
                        ) : (
                            <>
                                <Monitor className="h-4 w-4 mr-2" />
                                Auto Refresh Off
                            </>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportReport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Core Web Vitals Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                {metrics?.webVitals.LCP && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Largest Contentful Paint
                            </CardTitle>
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.webVitals.LCP.avg}ms</div>
                            <p className="text-xs text-muted-foreground">
                                P95: {metrics.webVitals.LCP.p95}ms
                            </p>
                            <Badge
                                variant={getWebVitalStatus('LCP', metrics.webVitals.LCP.avg) === 'good' ? 'default' : 'destructive'}
                                className="mt-2"
                            >
                                {getWebVitalStatus('LCP', metrics.webVitals.LCP.avg)}
                            </Badge>
                        </CardContent>
                    </Card>
                )}

                {metrics?.webVitals.FID && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                First Input Delay
                            </CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.webVitals.FID.avg}ms</div>
                            <p className="text-xs text-muted-foreground">
                                P95: {metrics.webVitals.FID.p95}ms
                            </p>
                            <Badge
                                variant={getWebVitalStatus('FID', metrics.webVitals.FID.avg) === 'good' ? 'default' : 'destructive'}
                                className="mt-2"
                            >
                                {getWebVitalStatus('FID', metrics.webVitals.FID.avg)}
                            </Badge>
                        </CardContent>
                    </Card>
                )}

                {metrics?.webVitals.CLS && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Cumulative Layout Shift
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.webVitals.CLS.avg.toFixed(3)}</div>
                            <p className="text-xs text-muted-foreground">
                                P95: {metrics.webVitals.CLS.p95.toFixed(3)}
                            </p>
                            <Badge
                                variant={getWebVitalStatus('CLS', metrics.webVitals.CLS.avg) === 'good' ? 'default' : 'destructive'}
                                className="mt-2"
                            >
                                {getWebVitalStatus('CLS', metrics.webVitals.CLS.avg)}
                            </Badge>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Tabs defaultValue="api" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="api">API Performance</TabsTrigger>
                    <TabsTrigger value="resources">System Resources</TabsTrigger>
                    <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="api" className="space-y-4">
                    <div className="grid gap-4">
                        {Object.entries(metrics?.apiPerformance || {}).map(([endpoint, stats]) => (
                            <Card key={endpoint}>
                                <CardHeader>
                                    <CardTitle className="text-lg">{endpoint}</CardTitle>
                                    <CardDescription>
                                        {stats.totalRequests} requests • {stats.successRate}% success rate
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Avg Response</div>
                                            <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">P95 Response</div>
                                            <div className="text-2xl font-bold">{stats.p95Duration}ms</div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                                            <div className="text-2xl font-bold">{stats.successRate}%</div>
                                            <Progress value={stats.successRate} className="mt-2" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-muted-foreground">Slow Requests</div>
                                            <div className="text-2xl font-bold text-red-600">{stats.slowRequests}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                    {metrics?.systemResources && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MemoryStick className="h-5 w-5" />
                                    Memory Usage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Current</div>
                                        <div className="text-2xl font-bold">{formatBytes(metrics.systemResources.current)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Average</div>
                                        <div className="text-2xl font-bold">{formatBytes(metrics.systemResources.avg)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Peak</div>
                                        <div className="text-2xl font-bold">{formatBytes(metrics.systemResources.max)}</div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                        Memory Usage Trend ({metrics.systemResources.samples} samples)
                                    </div>
                                    <Progress
                                        value={(metrics.systemResources.current / (100 * 1024 * 1024)) * 100}
                                        className="h-2"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    {alerts.length === 0 ? (
                        <Card>
                            <CardContent className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium">No Recent Alerts</h3>
                                    <p className="text-muted-foreground">System performance is within normal parameters</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {alerts.map((alert) => (
                                <Alert key={alert.id}>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle className="flex items-center gap-2">
                                        Performance Alert
                                        <Badge variant={getSeverityColor(alert.severity) as any}>
                                            {alert.severity}
                                        </Badge>
                                    </AlertTitle>
                                    <AlertDescription>
                                        <div className="mt-2">
                                            <p><strong>Type:</strong> {alert.type}</p>
                                            <p><strong>Value:</strong> {alert.value}{alert.type.includes('time') ? 'ms' : ''}</p>
                                            {alert.threshold && (
                                                <p><strong>Threshold:</strong> {alert.threshold}{alert.type.includes('time') ? 'ms' : ''}</p>
                                            )}
                                            {alert.url && (
                                                <p><strong>URL:</strong> <code className="text-sm">{alert.url}</code></p>
                                            )}
                                            <p className="text-sm text-muted-foreground mt-1">
                                                <Clock className="h-3 w-3 inline mr-1" />
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}