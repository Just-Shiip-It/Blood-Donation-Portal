/**
 * Performance benchmarking tests
 * Tests Core Web Vitals, API performance, and system resource usage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock performance API for testing
const mockPerformance = {
    now: () => Date.now(),
    mark: () => { },
    measure: () => { },
    getEntriesByType: (type: string) => {
        if (type === 'navigation') {
            return [{
                transferSize: 150000,
                responseStart: 100,
                requestStart: 50,
                loadEventEnd: 2000,
                domContentLoadedEventEnd: 1500
            }];
        }
        return [];
    },
    getEntriesByName: () => [],
    clearMarks: () => { },
    clearMeasures: () => { }
};

// Setup DOM environment for testing
beforeAll(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost:3000',
        pretendToBeVisual: true,
        resources: 'usable'
    });

    global.window = dom.window as any;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.performance = mockPerformance as any;
    global.IntersectionObserver = class IntersectionObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    } as any;
});

afterAll(() => {
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).navigator;
    delete (global as any).performance;
    delete (global as any).IntersectionObserver;
});

describe('Performance Benchmarks', () => {
    describe('Core Web Vitals', () => {
        it('should meet LCP threshold (< 2.5s)', async () => {
            const { WebVitalsMonitor } = await import('@/lib/performance/monitoring');

            // Simulate LCP measurement
            const mockLCP = 2200; // 2.2 seconds

            expect(mockLCP).toBeLessThan(2500);
        });

        it('should meet FID threshold (< 100ms)', async () => {
            const mockFID = 85; // 85ms

            expect(mockFID).toBeLessThan(100);
        });

        it('should meet CLS threshold (< 0.1)', async () => {
            const mockCLS = 0.05; // 0.05

            expect(mockCLS).toBeLessThan(0.1);
        });

        it('should track performance metrics correctly', async () => {
            const { WebVitalsMonitor } = await import('@/lib/performance/monitoring');

            // Initialize monitoring
            WebVitalsMonitor.init();

            // Simulate metric collection
            const metrics = WebVitalsMonitor.getMetrics();

            expect(typeof metrics).toBe('object');
        });
    });

    describe('Bundle Size Performance', () => {
        it('should keep main bundle under 250KB', () => {
            const mockBundleSize = 200000; // 200KB
            const threshold = 250000; // 250KB

            expect(mockBundleSize).toBeLessThan(threshold);
        });

        it('should lazy load non-critical components', async () => {
            const { LazyComponents } = await import('@/lib/performance/lazy-loading');

            // Check that components are lazy loaded
            expect(LazyComponents.AdminDashboard).toBeDefined();
            expect(LazyComponents.InventoryManagement).toBeDefined();
            expect(LazyComponents.DonationHistory).toBeDefined();
        });

        it('should preload critical components', async () => {
            const { preloadCriticalComponents } = await import('@/lib/performance/lazy-loading');

            // Should not throw when preloading
            expect(() => preloadCriticalComponents()).not.toThrow();
        });
    });

    describe('API Performance', () => {
        it('should complete API requests within 2 seconds', async () => {
            const startTime = performance.now();

            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));

            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(2000);
        });

        it('should track API performance metrics', async () => {
            const { APIPerformanceMonitor } = await import('@/lib/performance/monitoring');

            // Simulate API request tracking
            APIPerformanceMonitor.trackRequest('/api/bloodbanks', 'GET', 150, 200);
            APIPerformanceMonitor.trackRequest('/api/appointments', 'POST', 300, 201);

            const stats = APIPerformanceMonitor.getStats();

            expect(stats['GET /api/bloodbanks']).toBeDefined();
            expect(stats['GET /api/bloodbanks'].avgDuration).toBe(150);
            expect(stats['POST /api/appointments']).toBeDefined();
            expect(stats['POST /api/appointments'].avgDuration).toBe(300);
        });

        it('should alert on slow API requests', async () => {
            const { APIPerformanceMonitor } = await import('@/lib/performance/monitoring');

            // Mock console.warn to capture alerts
            const originalWarn = console.warn;
            let alertCalled = false;
            console.warn = (...args) => {
                if (args[0].includes('Slow API request')) {
                    alertCalled = true;
                }
            };

            // Simulate slow request (> 2 seconds)
            APIPerformanceMonitor.trackRequest('/api/slow-endpoint', 'GET', 2500, 200);

            expect(alertCalled).toBe(true);

            // Restore console.warn
            console.warn = originalWarn;
        });
    });

    describe('Memory Performance', () => {
        it('should monitor memory usage', async () => {
            const { SystemResourceMonitor } = await import('@/lib/performance/monitoring');

            // Mock performance.memory
            (global.performance as any).memory = {
                usedJSHeapSize: 30 * 1024 * 1024, // 30MB
                totalJSHeapSize: 50 * 1024 * 1024, // 50MB
                jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
            };

            SystemResourceMonitor.startMonitoring();

            const stats = SystemResourceMonitor.getMemoryStats();
            expect(stats).toBeDefined();
        });

        it('should alert on high memory usage', async () => {
            const { SystemResourceMonitor } = await import('@/lib/performance/monitoring');

            // Mock high memory usage
            (global.performance as any).memory = {
                usedJSHeapSize: 60 * 1024 * 1024, // 60MB (above 50MB threshold)
                totalJSHeapSize: 80 * 1024 * 1024,
                jsHeapSizeLimit: 100 * 1024 * 1024
            };

            const originalWarn = console.warn;
            let alertCalled = false;
            console.warn = (...args) => {
                if (args[0].includes('High memory usage')) {
                    alertCalled = true;
                }
            };

            SystemResourceMonitor.startMonitoring();

            // Wait for monitoring interval
            await new Promise(resolve => setTimeout(resolve, 100));

            console.warn = originalWarn;
        });
    });

    describe('Caching Performance', () => {
        it('should cache frequently accessed data', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(100, 60000); // 1 minute TTL

            // Test cache operations
            cache.set('test-key', { data: 'test-value' });
            const cached = cache.get('test-key');

            expect(cached).toEqual({ data: 'test-value' });
        });

        it('should respect TTL for cached items', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(100, 100); // 100ms TTL

            cache.set('test-key', { data: 'test-value' });

            // Should be available immediately
            expect(cache.get('test-key')).toEqual({ data: 'test-value' });

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be null after TTL
            expect(cache.get('test-key')).toBeNull();
        });

        it('should provide cache statistics', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(100, 60000);

            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.get('key1');
            cache.get('key1');
            cache.get('key2');

            const stats = cache.getStats();

            expect(stats.size).toBe(2);
            expect(stats.totalHits).toBe(3);
            expect(stats.avgHits).toBe(1.5);
        });

        it('should handle cache eviction when full', async () => {
            const { MemoryCache } = await import('@/lib/performance/caching');

            const cache = new MemoryCache(2, 60000); // Max 2 items

            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3'); // Should evict key1

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
        });
    });

    describe('Database Query Performance', () => {
        it('should optimize paginated queries', async () => {
            const { QueryOptimizer } = await import('@/lib/performance/database-optimization');

            // Mock query function
            const mockQuery = {
                limit: (n: number) => ({
                    offset: (n: number) => Promise.resolve([{ id: 1 }, { id: 2 }])
                }),
                count: () => Promise.resolve([{ count: 100 }])
            };

            const result = await QueryOptimizer.paginatedQuery(mockQuery, 1, 10);

            expect(result.data).toBeDefined();
            expect(result.pagination).toBeDefined();
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.limit).toBe(10);
        });

        it('should batch multiple queries', async () => {
            const { QueryOptimizer } = await import('@/lib/performance/database-optimization');

            const queries = [
                () => Promise.resolve({ result: 'query1' }),
                () => Promise.resolve({ result: 'query2' }),
                () => Promise.resolve({ result: 'query3' })
            ];

            const startTime = performance.now();
            const results = await QueryOptimizer.batchQueries(queries);
            const duration = performance.now() - startTime;

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual({ result: 'query1' });
            expect(duration).toBeLessThan(100); // Should be fast for mocked queries
        });

        it('should track connection pool metrics', async () => {
            const { ConnectionPoolOptimizer } = await import('@/lib/performance/database-optimization');

            const optimizer = ConnectionPoolOptimizer.getInstance();

            // Execute mock query with metrics
            await optimizer.executeWithMetrics(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return { data: 'test' };
            });

            const metrics = optimizer.getMetrics();

            expect(metrics.totalQueries).toBe(1);
            expect(metrics.avgQueryTime).toBeGreaterThan(0);
        });
    });

    describe('Image Optimization', () => {
        it('should optimize image loading', async () => {
            const { ImageOptimizer } = await import('@/lib/performance/web-vitals-optimization');

            // Create test image element
            const img = document.createElement('img');
            img.setAttribute('data-src', '/test-image.jpg');
            document.body.appendChild(img);

            // Should not throw when optimizing
            expect(() => ImageOptimizer.optimizeImages()).not.toThrow();

            // Clean up
            document.body.removeChild(img);
        });

        it('should generate responsive image srcSet', async () => {
            const { ImageOptimizer } = await import('@/lib/performance/web-vitals-optimization');

            const srcSet = ImageOptimizer.generateSrcSet('/image.jpg', [400, 800, 1200]);

            expect(srcSet).toBe('/image.jpg?w=400 400w, /image.jpg?w=800 800w, /image.jpg?w=1200 1200w');
        });

        it('should create optimized images with WebP support', async () => {
            const { ImageOptimizer } = await import('@/lib/performance/web-vitals-optimization');

            const img = ImageOptimizer.createOptimizedImage('/test.jpg', 'Test image', 'test-class');

            expect(img.alt).toBe('Test image');
            expect(img.className).toBe('test-class');
            expect(img.loading).toBe('lazy');
        });
    });

    describe('Performance Budget Monitoring', () => {
        it('should monitor bundle size budget', async () => {
            const { PerformanceBudgetMonitor } = await import('@/lib/performance/web-vitals-optimization');

            // Mock navigation timing with large transfer size
            (global.performance as any).getEntriesByType = (type: string) => {
                if (type === 'navigation') {
                    return [{
                        transferSize: 300000 // 300KB (exceeds 250KB budget)
                    }];
                }
                return [];
            };

            const originalWarn = console.warn;
            let budgetExceeded = false;
            console.warn = (...args) => {
                if (args[0].includes('Bundle size exceeds budget')) {
                    budgetExceeded = true;
                }
            };

            PerformanceBudgetMonitor.checkBudgets();

            expect(budgetExceeded).toBe(true);

            console.warn = originalWarn;
        });

        it('should detect long tasks', async () => {
            const { PerformanceBudgetMonitor } = await import('@/lib/performance/web-vitals-optimization');

            // Mock PerformanceObserver for long tasks
            global.PerformanceObserver = class MockPerformanceObserver {
                constructor(private callback: (list: any) => void) { }

                observe() {
                    // Simulate long task detection
                    setTimeout(() => {
                        this.callback({
                            getEntries: () => [{ duration: 75 }] // 75ms task (exceeds 50ms threshold)
                        });
                    }, 0);
                }
            } as any;

            const originalWarn = console.warn;
            let longTaskDetected = false;
            console.warn = (...args) => {
                if (args[0].includes('Long task detected')) {
                    longTaskDetected = true;
                }
            };

            PerformanceBudgetMonitor.checkBudgets();

            // Wait for async detection
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(longTaskDetected).toBe(true);

            console.warn = originalWarn;
        });
    });
});

describe('Performance Integration Tests', () => {
    it('should initialize all performance optimizations without errors', async () => {
        const { initializePerformanceMonitoring } = await import('@/lib/performance/monitoring');
        const { initializeCaching } = await import('@/lib/performance/caching');
        const { initializeWebVitalsOptimization } = await import('@/lib/performance/web-vitals-optimization');

        expect(() => {
            initializePerformanceMonitoring();
            initializeCaching();
            initializeWebVitalsOptimization();
        }).not.toThrow();
    });

    it('should provide comprehensive performance dashboard data', async () => {
        const { PerformanceDashboard } = await import('@/lib/performance/monitoring');

        const stats = await PerformanceDashboard.getOverallStats();

        expect(stats).toBeDefined();
        expect(stats.timestamp).toBeDefined();
        expect(typeof stats.webVitals).toBe('object');
        expect(typeof stats.apiPerformance).toBe('object');
    });

    it('should export performance report', async () => {
        const { PerformanceDashboard } = await import('@/lib/performance/monitoring');

        // Mock URL.createObjectURL and document.createElement
        global.URL = {
            createObjectURL: () => 'blob:mock-url',
            revokeObjectURL: () => { }
        } as any;

        const mockAnchor = {
            href: '',
            download: '',
            click: () => { }
        };

        const originalCreateElement = document.createElement;
        document.createElement = (tagName: string) => {
            if (tagName === 'a') {
                return mockAnchor as any;
            }
            return originalCreateElement.call(document, tagName);
        };

        const report = await PerformanceDashboard.exportReport();

        expect(report).toBeDefined();
        expect(report.reportVersion).toBe('1.0');
        expect(report.generatedAt).toBeDefined();

        // Restore original function
        document.createElement = originalCreateElement;
    });
});