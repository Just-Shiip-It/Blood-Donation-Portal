/**
 * Performance monitoring and alerting system
 * Tracks Core Web Vitals, API performance, and system metrics
 */

// Core Web Vitals monitoring
export class WebVitalsMonitor {
    private static metrics: Map<string, number[]> = new Map();
    private static thresholds = {
        LCP: 2500, // Largest Contentful Paint
        INP: 200,  // Interaction to Next Paint (replaces FID)
        CLS: 0.1,  // Cumulative Layout Shift
        FCP: 1800, // First Contentful Paint
        TTFB: 800  // Time to First Byte
    };

    static init() {
        if (typeof window === 'undefined') return;

        // Import web-vitals dynamically
        import('web-vitals').then((webVitals) => {
            if (webVitals.onCLS) webVitals.onCLS(this.handleMetric.bind(this));
            if (webVitals.onINP) webVitals.onINP(this.handleMetric.bind(this)); // FID is deprecated, use INP
            if (webVitals.onFCP) webVitals.onFCP(this.handleMetric.bind(this));
            if (webVitals.onLCP) webVitals.onLCP(this.handleMetric.bind(this));
            if (webVitals.onTTFB) webVitals.onTTFB(this.handleMetric.bind(this));
        }).catch(() => {
            // Fallback manual implementation
            this.initManualVitals();
        });
    }

    private static handleMetric(metric: any) {
        const { name, value } = metric;

        // Store metric
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(value);

        // Check thresholds
        const threshold = this.thresholds[name as keyof typeof this.thresholds];
        if (threshold && value > threshold) {
            this.alertPoorPerformance(name, value, threshold);
        }

        // Send to analytics
        this.sendToAnalytics(name, value);
    }

    private static initManualVitals() {
        // Manual LCP tracking
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            this.handleMetric({ name: 'LCP', value: lastEntry.startTime });
        });

        try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch {
            // Browser doesn't support LCP
        }

        // Manual INP tracking (replaces FID)
        const inpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
                this.handleMetric({ name: 'INP', value: entry.processingStart - entry.startTime });
            });
        });

        try {
            inpObserver.observe({ entryTypes: ['first-input'] });
        } catch {
            // Browser doesn't support INP
        }
    }

    private static alertPoorPerformance(metric: string, value: number, threshold: number) {
        console.warn(`Poor ${metric} performance: ${value}ms (threshold: ${threshold}ms)`);

        // Send alert to monitoring service
        if (typeof window !== 'undefined') {
            fetch('/api/monitoring/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'performance',
                    metric,
                    value,
                    threshold,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            }).catch(() => {
                // Silently handle alert failures
            });
        }
    }

    private static sendToAnalytics(metric: string, value: number) {
        // Send to analytics service (could be Google Analytics, custom analytics, etc.)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', metric, {
                event_category: 'Web Vitals',
                value: Math.round(value),
                non_interaction: true,
            });
        }
    }

    static getMetrics() {
        const summary: Record<string, any> = {};

        for (const [name, values] of this.metrics.entries()) {
            summary[name] = {
                count: values.length,
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                p75: this.percentile(values, 0.75),
                p95: this.percentile(values, 0.95)
            };
        }

        return summary;
    }

    private static percentile(values: number[], p: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[index] || 0;
    }
}

// API Performance Monitor
export class APIPerformanceMonitor {
    private static requests: Map<string, any[]> = new Map();
    private static slowRequestThreshold = 2000; // 2 seconds

    static trackRequest(url: string, method: string, duration: number, status: number) {
        const key = `${method} ${url}`;

        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }

        const requestData = {
            duration,
            status,
            timestamp: Date.now(),
            success: status >= 200 && status < 300
        };

        this.requests.get(key)!.push(requestData);

        // Alert on slow requests
        if (duration > this.slowRequestThreshold) {
            this.alertSlowRequest(url, method, duration);
        }

        // Keep only last 100 requests per endpoint
        const requests = this.requests.get(key)!;
        if (requests.length > 100) {
            requests.splice(0, requests.length - 100);
        }
    }

    private static alertSlowRequest(url: string, method: string, duration: number) {
        console.warn(`Slow API request: ${method} ${url} took ${duration}ms`);

        // Send to monitoring service
        if (typeof window !== 'undefined') {
            fetch('/api/monitoring/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'slow_api',
                    url,
                    method,
                    duration,
                    timestamp: Date.now()
                })
            }).catch(() => {
                // Silently handle failures
            });
        }
    }

    static getStats() {
        const stats: Record<string, any> = {};

        for (const [endpoint, requests] of this.requests.entries()) {
            const durations = requests.map(r => r.duration);
            const successRate = requests.filter(r => r.success).length / requests.length;

            stats[endpoint] = {
                totalRequests: requests.length,
                avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                p95Duration: this.percentile(durations, 0.95),
                successRate: Math.round(successRate * 100),
                slowRequests: requests.filter(r => r.duration > this.slowRequestThreshold).length
            };
        }

        return stats;
    }

    private static percentile(values: number[], p: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[index] || 0;
    }
}

// System Resource Monitor
export class SystemResourceMonitor {
    private static memoryUsage: number[] = [];
    private static isMonitoring = false;

    static startMonitoring() {
        if (this.isMonitoring || typeof window === 'undefined') return;

        this.isMonitoring = true;

        // Monitor memory usage
        setInterval(() => {
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                this.memoryUsage.push(memory.usedJSHeapSize);

                // Keep only last 100 measurements
                if (this.memoryUsage.length > 100) {
                    this.memoryUsage.shift();
                }

                // Alert on high memory usage (>50MB)
                if (memory.usedJSHeapSize > 50 * 1024 * 1024) {
                    this.alertHighMemoryUsage(memory.usedJSHeapSize);
                }
            }
        }, 30000); // Check every 30 seconds
    }

    private static alertHighMemoryUsage(usage: number) {
        const usageMB = Math.round(usage / (1024 * 1024));
        console.warn(`High memory usage detected: ${usageMB}MB`);

        // Send alert
        if (typeof window !== 'undefined') {
            fetch('/api/monitoring/alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'high_memory',
                    usage: usageMB,
                    timestamp: Date.now()
                })
            }).catch(() => {
                // Silently handle failures
            });
        }
    }

    static getMemoryStats() {
        if (this.memoryUsage.length === 0) return null;

        return {
            current: this.memoryUsage[this.memoryUsage.length - 1],
            avg: this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length,
            max: Math.max(...this.memoryUsage),
            samples: this.memoryUsage.length
        };
    }
}

// Performance Dashboard Data
export class PerformanceDashboard {
    static async getOverallStats() {
        return {
            webVitals: WebVitalsMonitor.getMetrics(),
            apiPerformance: APIPerformanceMonitor.getStats(),
            systemResources: SystemResourceMonitor.getMemoryStats(),
            timestamp: Date.now()
        };
    }

    static async exportReport() {
        const stats = await this.getOverallStats();
        const report = {
            ...stats,
            generatedAt: new Date().toISOString(),
            reportVersion: '1.0'
        };

        // Create downloadable report
        if (typeof window !== 'undefined') {
            const blob = new Blob([JSON.stringify(report, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `performance-report-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }

        return report;
    }
}

// Initialize monitoring on app start
export function initializePerformanceMonitoring() {
    if (typeof window !== 'undefined') {
        WebVitalsMonitor.init();
        SystemResourceMonitor.startMonitoring();

        // Track navigation performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
                if (navigation) {
                    WebVitalsMonitor['handleMetric']({
                        name: 'TTFB',
                        value: navigation.responseStart - navigation.requestStart
                    });
                }
            }, 0);
        });
    }
}