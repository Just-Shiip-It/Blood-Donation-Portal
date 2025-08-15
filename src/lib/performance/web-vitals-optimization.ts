/**
 * Core Web Vitals optimization utilities
 * Implements strategies to improve LCP, FID, CLS, and other performance metrics
 */

// Image optimization for better LCP
export class ImageOptimizer {
    static optimizeImages(): void {
        if (typeof window === 'undefined') return;

        // Lazy load images below the fold
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    img.src = img.dataset.src!;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));

        // Preload critical images
        this.preloadCriticalImages();
    }

    private static preloadCriticalImages(): void {
        const criticalImages = [
            '/icons/icon-192x192.png',
            '/images/hero-bg.jpg', // If exists
            '/images/logo.png' // If exists
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    // Generate responsive image srcSet
    static generateSrcSet(basePath: string, sizes: number[]): string {
        return sizes
            .map(size => `${basePath}?w=${size} ${size}w`)
            .join(', ');
    }

    // Optimize image loading with WebP fallback
    static createOptimizedImage(src: string, alt: string, className?: string): HTMLImageElement {
        const img = document.createElement('img');

        // Use WebP if supported, fallback to original
        const supportsWebP = this.supportsWebP();
        const optimizedSrc = supportsWebP ? src.replace(/\.(jpg|jpeg|png)$/, '.webp') : src;

        img.src = optimizedSrc;
        img.alt = alt;
        if (className) img.className = className;

        // Add loading="lazy" for images below the fold
        img.loading = 'lazy';

        return img;
    }

    private static supportsWebP(): boolean {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const dataUrl = canvas.toDataURL('image/webp');
            return Boolean(dataUrl && dataUrl.indexOf('data:image/webp') === 0);
        } catch {
            // Fallback for test environments or unsupported browsers
            return false;
        }
    }
}

// Layout Shift Prevention
export class LayoutShiftPrevention {
    static preventCLS(): void {
        // Reserve space for dynamic content
        this.reserveSpaceForDynamicContent();

        // Optimize font loading
        this.optimizeFontLoading();

        // Stabilize image dimensions
        this.stabilizeImageDimensions();
    }

    private static reserveSpaceForDynamicContent(): void {
        // Add skeleton loaders for dynamic content
        const dynamicContainers = document.querySelectorAll('[data-dynamic]');

        dynamicContainers.forEach(() => {
            // Skeleton creation logic would go here
            // Removed unused container parameter
        });
    }

    private static createSkeleton(container: Element): HTMLElement {
        const skeleton = document.createElement('div');
        skeleton.className = 'animate-pulse bg-gray-200 rounded';
        skeleton.style.height = '200px'; // Default height
        skeleton.setAttribute('data-skeleton', 'true');
        return skeleton;
    }

    private static optimizeFontLoading(): void {
        // Preload critical fonts
        const criticalFonts = [
            '/fonts/geist-sans.woff2',
            '/fonts/geist-mono.woff2'
        ];

        criticalFonts.forEach(font => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.type = 'font/woff2';
            link.crossOrigin = 'anonymous';
            link.href = font;
            document.head.appendChild(link);
        });

        // Use font-display: swap for web fonts
        const style = document.createElement('style');
        style.textContent = `
      @font-face {
        font-family: 'Geist';
        font-display: swap;
      }
    `;
        document.head.appendChild(style);
    }

    private static stabilizeImageDimensions(): void {
        const images = document.querySelectorAll('img:not([width]):not([height])');

        images.forEach(img => {
            // Set aspect ratio to prevent layout shift
            (img as HTMLImageElement).style.aspectRatio = '16/9'; // Default aspect ratio
        });
    }
}

// First Input Delay Optimization
export class FIDOptimization {
    static optimizeFID(): void {
        // Break up long tasks
        this.breakUpLongTasks();

        // Defer non-critical JavaScript
        this.deferNonCriticalJS();

        // Use web workers for heavy computations
        this.setupWebWorkers();
    }

    private static breakUpLongTasks(): void {
        // Use scheduler.postTask if available, fallback to setTimeout
        const scheduler = (window as any).scheduler;

        if (scheduler && scheduler.postTask) {
            // Use modern scheduler API
            window.addEventListener('load', () => {
                scheduler.postTask(() => {
                    this.initializeNonCriticalFeatures();
                }, { priority: 'background' });
            });
        } else {
            // Fallback to setTimeout
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.initializeNonCriticalFeatures();
                }, 0);
            });
        }
    }

    private static initializeNonCriticalFeatures(): void {
        // Initialize features that don't need to be ready immediately
        const tasks = [
            () => this.initializeAnalytics(),
            () => this.initializeServiceWorker(),
            () => this.initializeNotifications(),
            () => this.warmupCache()
        ];

        // Execute tasks with yielding
        this.executeTasksWithYielding(tasks);
    }

    private static async executeTasksWithYielding(tasks: (() => void)[]): Promise<void> {
        for (const task of tasks) {
            task();

            // Yield to main thread
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    private static initializeAnalytics(): void {
        // Initialize analytics (non-blocking)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', 'GA_MEASUREMENT_ID');
        }
    }

    private static initializeServiceWorker(): void {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Silently handle registration failures
            });
        }
    }

    private static initializeNotifications(): void {
        // Initialize push notifications
        if ('Notification' in window && 'serviceWorker' in navigator) {
            // Request permission later, not immediately
        }
    }

    private static warmupCache(): void {
        // Warm up cache with frequently accessed data
        fetch('/api/bloodbanks?limit=10').catch(() => {
            // Silently handle failures
        });
    }

    private static deferNonCriticalJS(): void {
        // Defer loading of non-critical JavaScript
        const nonCriticalScripts = [
            '/js/analytics.js',
            '/js/chat-widget.js',
            '/js/feedback.js'
        ];

        window.addEventListener('load', () => {
            setTimeout(() => {
                nonCriticalScripts.forEach(src => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    document.head.appendChild(script);
                });
            }, 1000);
        });
    }

    private static setupWebWorkers(): void {
        // Setup web workers for heavy computations
        if (typeof Worker !== 'undefined') {
            try {
                const worker = new Worker('/js/data-processor.js');

                worker.onmessage = (event) => {
                    // Handle worker messages
                    const { type, data } = event.data;

                    switch (type) {
                        case 'SEARCH_RESULTS':
                            this.handleSearchResults(data);
                            break;
                        case 'ANALYTICS_PROCESSED':
                            this.handleAnalyticsData(data);
                            break;
                    }
                };

                // Store worker reference for later use
                (window as any).dataWorker = worker;
            } catch (error) {
                console.warn('Web Worker not supported or failed to initialize');
            }
        }
    }

    private static handleSearchResults(data: any): void {
        // Handle search results from web worker
        const event = new CustomEvent('searchResultsReady', { detail: data });
        window.dispatchEvent(event);
    }

    private static handleAnalyticsData(data: any): void {
        // Handle processed analytics data
        const event = new CustomEvent('analyticsDataReady', { detail: data });
        window.dispatchEvent(event);
    }
}

// Resource Hints Optimizer
export class ResourceHintsOptimizer {
    static addResourceHints(): void {
        this.addDNSPrefetch();
        this.addPreconnect();
        this.addModulePreload();
    }

    private static addDNSPrefetch(): void {
        const domains = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://api.supabase.co'
        ];

        domains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = domain;
            document.head.appendChild(link);
        });
    }

    private static addPreconnect(): void {
        const criticalDomains = [
            'https://fonts.googleapis.com',
            'https://api.supabase.co'
        ];

        criticalDomains.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }

    private static addModulePreload(): void {
        const criticalModules = [
            '/_next/static/chunks/main.js',
            '/_next/static/chunks/pages/_app.js'
        ];

        criticalModules.forEach(module => {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = module;
            document.head.appendChild(link);
        });
    }
}

// Performance Budget Monitor
export class PerformanceBudgetMonitor {
    private static budgets = {
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        bundleSize: 250000, // 250KB
        imageSize: 500000   // 500KB
    };

    static checkBudgets(): void {
        this.checkBundleSize();
        this.checkImageSizes();
        this.monitorRuntimePerformance();
    }

    private static checkBundleSize(): void {
        if (typeof window !== 'undefined' && 'performance' in window) {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

            if (navigation && navigation.transferSize > this.budgets.bundleSize) {
                console.warn(`Bundle size exceeds budget: ${navigation.transferSize} > ${this.budgets.bundleSize}`);

                // Send alert
                this.sendBudgetAlert('bundle_size', navigation.transferSize, this.budgets.bundleSize);
            }
        }
    }

    private static checkImageSizes(): void {
        const images = document.querySelectorAll('img');

        images.forEach(img => {
            img.addEventListener('load', () => {
                // Estimate image size (not exact, but good approximation)
                const estimatedSize = img.naturalWidth * img.naturalHeight * 3; // RGB

                if (estimatedSize > this.budgets.imageSize) {
                    console.warn(`Large image detected: ${img.src} (~${Math.round(estimatedSize / 1024)}KB)`);
                }
            });
        });
    }

    private static monitorRuntimePerformance(): void {
        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry: any) => {
                    if (entry.duration > 50) { // Long task threshold
                        console.warn(`Long task detected: ${entry.duration}ms`);
                        this.sendBudgetAlert('long_task', entry.duration, 50);
                    }
                });
            });

            try {
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // Browser doesn't support longtask
            }
        }
    }

    private static sendBudgetAlert(type: string, actual: number, budget: number): void {
        if (typeof window !== 'undefined') {
            fetch('/api/monitoring/budget-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    actual,
                    budget,
                    timestamp: Date.now(),
                    url: window.location.href
                })
            }).catch(() => {
                // Silently handle failures
            });
        }
    }
}

// Initialize all optimizations
export function initializeWebVitalsOptimization(): void {
    if (typeof window !== 'undefined') {
        // Run optimizations when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                ImageOptimizer.optimizeImages();
                LayoutShiftPrevention.preventCLS();
                ResourceHintsOptimizer.addResourceHints();
                PerformanceBudgetMonitor.checkBudgets();
            });
        } else {
            ImageOptimizer.optimizeImages();
            LayoutShiftPrevention.preventCLS();
            ResourceHintsOptimizer.addResourceHints();
            PerformanceBudgetMonitor.checkBudgets();
        }

        // Run FID optimizations after load
        window.addEventListener('load', () => {
            FIDOptimization.optimizeFID();
        });
    }
}