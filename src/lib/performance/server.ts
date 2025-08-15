/**
 * Server-side performance utilities
 * Database optimization and server-specific performance features
 */

// Server-side performance utilities
export * from './database-optimization';

// Initialize server-side performance optimizations
export async function initializeServerPerformance() {
    try {
        const { DatabaseIndexes } = await import('./database-optimization');

        // Create performance indexes
        const indexResult = await DatabaseIndexes.createPerformanceIndexes();
        console.log(`Created ${indexResult.created} performance indexes`);

        // Analyze table statistics
        await DatabaseIndexes.analyzeTableStatistics();
        console.log('Updated database statistics for query optimization');

    } catch (error) {
        console.warn('Failed to initialize server performance optimizations:', error);
    }
}