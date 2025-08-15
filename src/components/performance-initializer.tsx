/**
 * Performance initialization component
 * Initializes all performance optimizations on the client side
 */

'use client';

import { useEffect } from 'react';

export function PerformanceInitializer() {
    useEffect(() => {
        // Initialize performance optimizations
        const initializePerformance = async () => {
            try {
                const { initializePerformanceOptimizations } = await import('@/lib/performance');
                initializePerformanceOptimizations();
            } catch (error) {
                console.warn('Failed to initialize performance optimizations:', error);
            }
        };

        initializePerformance();
    }, []);

    // This component doesn't render anything
    return null;
}