/**
 * Performance optimization initialization
 * Central entry point for all performance optimizations
 */

// Export client-side performance utilities
export * from './monitoring';
export * from './caching';
export * from './web-vitals-optimization';

// Server-side utilities (import dynamically to avoid client-side bundling)
// export * from './database-optimization'; // Only import on server-side

// Initialize all performance optimizations
export function initializePerformanceOptimizations() {
    if (typeof window !== 'undefined') {
        // Client-side initializations
        Promise.all([
            import('./monitoring').then(({ initializePerformanceMonitoring }) =>
                initializePerformanceMonitoring()
            ),
            import('./caching').then(({ initializeCaching }) =>
                initializeCaching()
            ),
            import('./web-vitals-optimization').then(({ initializeWebVitalsOptimization }) =>
                initializeWebVitalsOptimization()
            ),
            // Lazy loading will be added later
            Promise.resolve()
        ]).catch(error => {
            console.warn('Failed to initialize some performance optimizations:', error);
        });
    }
}

// Server-side utilities are in ./server.ts to avoid client-side bundling

// Performance monitoring utilities
export class PerformanceManager {
    private static instance: PerformanceManager;

    static getInstance(): PerformanceManager {
        if (!this.instance) {
            this.instance = new PerformanceManager();
        }
        return this.instance;
    }

    // Get comprehensive performance report
    async getPerformanceReport() {
        const [monitoring, caching] = await Promise.all([
            import('./monitoring').then(m => m.PerformanceDashboard.getOverallStats()),
            import('./caching').then(c => c.globalCache.getStats())
        ]);

        return {
            monitoring,
            caching,
            timestamp: Date.now(),
            version: '1.0'
        };
    }

    // Optimize performance based on current metrics
    async optimizePerformance() {
        const report = await this.getPerformanceReport();
        const optimizations: string[] = [];

        // Check cache hit rate
        const hitRate = parseFloat(report.caching.hitRate.replace('%', ''));
        if (hitRate < 70) {
            // Warm cache if hit rate is low
            const { cacheWarmer } = await import('./caching');
            await cacheWarmer.warmFrequentlyAccessedData();
            optimizations.push('Cache warmed due to low hit rate');
        }

        // Check memory usage
        if (report.monitoring.systemResources) {
            const memoryMB = report.monitoring.systemResources.current / (1024 * 1024);
            if (memoryMB > 75) {
                // Clear old cache entries if memory usage is high
                // In a real implementation, you might clear specific cache patterns
                optimizations.push('Memory optimization triggered');
            }
        }

        return {
            optimizations,
            timestamp: Date.now()
        };
    }

    // Health check for performance systems
    async healthCheck() {
        const checks = {
            monitoring: false,
            caching: false,
            webVitals: false,
            database: false
        };

        try {
            // Check monitoring system
            const { WebVitalsMonitor } = await import('./monitoring');
            const metrics = WebVitalsMonitor.getMetrics();
            checks.monitoring = Object.keys(metrics).length > 0;
        } catch {
            // Monitoring not available
        }

        try {
            // Check caching system
            const { globalCache } = await import('./caching');
            const stats = globalCache.getStats();
            checks.caching = typeof stats === 'object';
        } catch {
            // Caching not available
        }

        try {
            // Check web vitals optimization
            checks.webVitals = typeof window !== 'undefined' && 'performance' in window;
        } catch {
            // Web vitals not available
        }

        // Database optimization check is server-side only
        if (typeof window === 'undefined') {
            try {
                const { ConnectionPoolOptimizer } = await import('./database-optimization');
                const optimizer = ConnectionPoolOptimizer.getInstance();
                const metrics = optimizer.getMetrics();
                checks.database = typeof metrics === 'object';
            } catch {
                // Database optimization not available
            }
        }

        return {
            checks,
            healthy: Object.values(checks).filter(Boolean).length >= 2,
            timestamp: Date.now()
        };
    }
}

// Performance middleware for API routes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withPerformanceMonitoring(handler: (req: any, res: any) => Promise<any>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: any, res: any) => {
        const startTime = Date.now();
        const url = req.url || 'unknown';
        const method = req.method || 'GET';

        try {
            const result = await handler(req, res);
            const duration = Date.now() - startTime;

            // Track API performance
            if (typeof window !== 'undefined') {
                const { APIPerformanceMonitor } = await import('./monitoring');
                APIPerformanceMonitor.trackRequest(url, method, duration, res.status || 200);
            }

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Track failed request
            if (typeof window !== 'undefined') {
                const { APIPerformanceMonitor } = await import('./monitoring');
                APIPerformanceMonitor.trackRequest(url, method, duration, 500);
            }

            throw error;
        }
    };
}

// Performance-aware fetch wrapper
export async function performanceFetch(url: string, options?: RequestInit) {
    const startTime = Date.now();

    try {
        const response = await fetch(url, options);
        const duration = Date.now() - startTime;

        // Track request performance
        if (typeof window !== 'undefined') {
            const { APIPerformanceMonitor } = await import('./monitoring');
            APIPerformanceMonitor.trackRequest(url, options?.method || 'GET', duration, response.status);
        }

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;

        // Track failed request
        if (typeof window !== 'undefined') {
            const { APIPerformanceMonitor } = await import('./monitoring');
            APIPerformanceMonitor.trackRequest(url, options?.method || 'GET', duration, 0);
        }

        throw error;
    }
}

// Export singleton instance
export const performanceManager = PerformanceManager.getInstance();