/**
 * Core performance functionality tests
 * Tests the essential performance optimization features
 */

import { describe, it, expect } from 'vitest';

describe('Core Performance Features', () => {
    describe('Caching System', () => {
        it('should create and use memory cache', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(100, 60000);

            // Test basic operations
            cache.set('test-key', { data: 'test-value' });
            const result = cache.get('test-key');

            expect(result).toEqual({ data: 'test-value' });
        });

        it('should handle cache expiration', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(100, 50); // 50ms TTL

            cache.set('expire-key', 'expire-value');
            expect(cache.get('expire-key')).toBe('expire-value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cache.get('expire-key')).toBeNull();
        });
    });

    describe('Database Optimization', () => {
        it('should batch queries efficiently', async () => {
            const { QueryOptimizer } = await import('@/lib/performance/database-optimization');

            const queries = [
                () => Promise.resolve('result1'),
                () => Promise.resolve('result2'),
                () => Promise.resolve('result3')
            ];

            const results = await QueryOptimizer.batchQueries(queries);

            expect(results).toEqual(['result1', 'result2', 'result3']);
        });

        it('should track connection metrics', async () => {
            const { ConnectionPoolOptimizer } = await import('@/lib/performance/database-optimization');

            const optimizer = ConnectionPoolOptimizer.getInstance();

            const result = await optimizer.executeWithMetrics(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'test-result';
            });

            expect(result).toBe('test-result');

            const metrics = optimizer.getMetrics();
            expect(metrics.totalQueries).toBeGreaterThan(0);
        });
    });

    describe('Performance Monitoring', () => {
        it('should track API performance', async () => {
            const { APIPerformanceMonitor } = await import('@/lib/performance/monitoring');

            APIPerformanceMonitor.trackRequest('/api/test', 'GET', 150, 200);

            const stats = APIPerformanceMonitor.getStats();
            expect(stats['GET /api/test']).toBeDefined();
            expect(stats['GET /api/test'].avgDuration).toBe(150);
        });

        it('should provide performance dashboard data', async () => {
            const { PerformanceDashboard } = await import('@/lib/performance/monitoring');

            const stats = await PerformanceDashboard.getOverallStats();

            expect(stats).toBeDefined();
            expect(stats.timestamp).toBeDefined();
            expect(typeof stats.webVitals).toBe('object');
            expect(typeof stats.apiPerformance).toBe('object');
        });
    });

    describe('Performance Manager', () => {
        it('should provide comprehensive performance report', async () => {
            const { performanceManager } = await import('@/lib/performance');

            const report = await performanceManager.getPerformanceReport();

            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.version).toBe('1.0');
        });

        it('should perform health checks', async () => {
            const { performanceManager } = await import('@/lib/performance');

            const health = await performanceManager.healthCheck();

            expect(health).toBeDefined();
            expect(health.checks).toBeDefined();
            expect(health.timestamp).toBeDefined();
            expect(typeof health.healthy).toBe('boolean');
        });
    });

    describe('Performance Initialization', () => {
        it('should initialize without errors', async () => {
            const { initializePerformanceOptimizations } = await import('@/lib/performance');

            expect(() => {
                initializePerformanceOptimizations();
            }).not.toThrow();
        });
    });
});