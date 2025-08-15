/**
 * Comprehensive caching strategies for optimal performance
 * Implements multi-level caching with TTL, invalidation, and cache warming
 */

// In-memory cache with TTL
export class MemoryCache {
    private cache = new Map<string, { data: unknown; expires: number; hits: number }>();
    private maxSize: number;
    private defaultTTL: number;

    constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
    }

    set(key: string, data: unknown, ttl?: number): void {
        // Evict oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            data,
            expires: Date.now() + (ttl || this.defaultTTL),
            hits: 0
        });
    }

    get(key: string): unknown | null {
        const entry = this.cache.get(key);

        if (!entry) return null;

        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }

        entry.hits++;
        return entry.data;
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    getStats() {
        const entries = Array.from(this.cache.values());
        return {
            size: this.cache.size,
            totalHits: entries.reduce((sum, entry) => sum + entry.hits, 0),
            avgHits: entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.hits, 0) / entries.length : 0
        };
    }
}

// Browser storage cache with compression
export class BrowserStorageCache {
    private storage: Storage;
    private prefix: string;

    constructor(useSessionStorage = false, prefix = 'bdp_cache_') {
        this.storage = useSessionStorage ? sessionStorage : localStorage;
        this.prefix = prefix;
    }

    async set(key: string, data: any, ttl?: number): Promise<void> {
        try {
            const item = {
                data,
                expires: ttl ? Date.now() + ttl : null,
                compressed: false
            };

            let serialized = JSON.stringify(item);

            // Compress large data (>10KB)
            if (serialized.length > 10240) {
                try {
                    // Use compression if available
                    const compressed = await this.compress(serialized);
                    if (compressed.length < serialized.length) {
                        item.compressed = true;
                        serialized = compressed;
                    }
                } catch {
                    // Compression failed, use original
                }
            }

            this.storage.setItem(this.prefix + key, serialized);
        } catch (error) {
            // Storage quota exceeded or other error
            console.warn('Cache storage failed:', error);
            this.cleanup();
        }
    }

    async get(key: string): Promise<any | null> {
        try {
            const stored = this.storage.getItem(this.prefix + key);
            if (!stored) return null;

            let item;
            try {
                if (stored.startsWith('{')) {
                    item = JSON.parse(stored);
                } else {
                    // Might be compressed
                    const decompressed = await this.decompress(stored);
                    item = JSON.parse(decompressed);
                }
            } catch {
                // Invalid data, remove it
                this.delete(key);
                return null;
            }

            // Check expiration
            if (item.expires && Date.now() > item.expires) {
                this.delete(key);
                return null;
            }

            return item.data;
        } catch {
            return null;
        }
    }

    delete(key: string): void {
        this.storage.removeItem(this.prefix + key);
    }

    clear(): void {
        const keys = Object.keys(this.storage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                this.storage.removeItem(key);
            }
        });
    }

    private async compress(data: string): Promise<string> {
        if (typeof CompressionStream !== 'undefined') {
            const stream = new CompressionStream('gzip');
            const writer = stream.writable.getWriter();
            const reader = stream.readable.getReader();

            writer.write(new TextEncoder().encode(data));
            writer.close();

            const chunks: Uint8Array[] = [];
            let done = false;

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
            }

            const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
                compressed.set(chunk, offset);
                offset += chunk.length;
            }

            return btoa(String.fromCharCode(...compressed));
        }

        // Fallback: no compression
        return data;
    }

    private async decompress(data: string): Promise<string> {
        if (typeof DecompressionStream !== 'undefined') {
            try {
                const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
                const stream = new DecompressionStream('gzip');
                const writer = stream.writable.getWriter();
                const reader = stream.readable.getReader();

                writer.write(compressed);
                writer.close();

                const chunks: Uint8Array[] = [];
                let done = false;

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) chunks.push(value);
                }

                const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
                let offset = 0;
                for (const chunk of chunks) {
                    decompressed.set(chunk, offset);
                    offset += chunk.length;
                }

                return new TextDecoder().decode(decompressed);
            } catch {
                // Decompression failed, assume it's not compressed
                return data;
            }
        }

        return data;
    }

    private cleanup(): void {
        // Remove expired items to free up space
        const keys = Object.keys(this.storage);
        keys.forEach(key => {
            if (key.startsWith(this.prefix)) {
                try {
                    const stored = this.storage.getItem(key);
                    if (stored) {
                        const item = JSON.parse(stored);
                        if (item.expires && Date.now() > item.expires) {
                            this.storage.removeItem(key);
                        }
                    }
                } catch {
                    // Invalid item, remove it
                    this.storage.removeItem(key);
                }
            }
        });
    }
}

// Multi-level cache manager
export class CacheManager {
    private memoryCache: MemoryCache;
    private storageCache: BrowserStorageCache;
    private cacheHitStats = { memory: 0, storage: 0, miss: 0 };

    constructor() {
        this.memoryCache = new MemoryCache(500, 300000); // 5 minutes
        this.storageCache = new BrowserStorageCache(false, 'bdp_cache_');
    }

    async get(key: string): Promise<any | null> {
        // Try memory cache first (fastest)
        let data = this.memoryCache.get(key);
        if (data !== null) {
            this.cacheHitStats.memory++;
            return data;
        }

        // Try storage cache
        data = await this.storageCache.get(key);
        if (data !== null) {
            this.cacheHitStats.storage++;
            // Promote to memory cache
            this.memoryCache.set(key, data);
            return data;
        }

        this.cacheHitStats.miss++;
        return null;
    }

    async set(key: string, data: any, ttl?: number): Promise<void> {
        // Set in both caches
        this.memoryCache.set(key, data, ttl);
        await this.storageCache.set(key, data, ttl);
    }

    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        this.storageCache.delete(key);
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        this.storageCache.clear();
    }

    getStats() {
        const total = this.cacheHitStats.memory + this.cacheHitStats.storage + this.cacheHitStats.miss;
        return {
            hitRate: total > 0 ? ((this.cacheHitStats.memory + this.cacheHitStats.storage) / total * 100).toFixed(2) + '%' : '0%',
            memoryHits: this.cacheHitStats.memory,
            storageHits: this.cacheHitStats.storage,
            misses: this.cacheHitStats.miss,
            memoryStats: this.memoryCache.getStats()
        };
    }
}

// Cache warming strategies
export class CacheWarmer {
    private cacheManager: CacheManager;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
    }

    // Warm cache with frequently accessed data
    async warmFrequentlyAccessedData(): Promise<void> {
        const warmingTasks = [
            this.warmBloodBankData(),
            this.warmBloodTypeData(),
            this.warmUserPreferences(),
            this.warmSystemSettings()
        ];

        await Promise.allSettled(warmingTasks);
    }

    private async warmBloodBankData(): Promise<void> {
        try {
            const response = await fetch('/api/bloodbanks?limit=50');
            if (response.ok) {
                const data = await response.json();
                await this.cacheManager.set('bloodbanks:active', data, 600000); // 10 minutes
            }
        } catch (error) {
            console.warn('Failed to warm blood bank cache:', error);
        }
    }

    private async warmBloodTypeData(): Promise<void> {
        const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

        for (const bloodType of bloodTypes) {
            try {
                const response = await fetch(`/api/bloodbanks/inventory?bloodType=${bloodType}`);
                if (response.ok) {
                    const data = await response.json();
                    await this.cacheManager.set(`inventory:${bloodType}`, data, 300000); // 5 minutes
                }
            } catch (error) {
                console.warn(`Failed to warm ${bloodType} inventory cache:`, error);
            }
        }
    }

    private async warmUserPreferences(): Promise<void> {
        try {
            const response = await fetch('/api/auth/profile');
            if (response.ok) {
                const data = await response.json();
                await this.cacheManager.set('user:preferences', data.preferences, 1800000); // 30 minutes
            }
        } catch (error) {
            console.warn('Failed to warm user preferences cache:', error);
        }
    }

    private async warmSystemSettings(): Promise<void> {
        try {
            const response = await fetch('/api/system/settings');
            if (response.ok) {
                const data = await response.json();
                await this.cacheManager.set('system:settings', data, 3600000); // 1 hour
            }
        } catch (error) {
            console.warn('Failed to warm system settings cache:', error);
        }
    }
}

// Cache invalidation strategies
export class CacheInvalidator {
    private cacheManager: CacheManager;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
    }

    // Invalidate cache based on data changes
    async invalidateByPattern(pattern: string): Promise<void> {
        // This would need to be implemented based on the specific cache implementation
        // For now, we'll clear related caches manually

        if (pattern.includes('bloodbank')) {
            await this.cacheManager.delete('bloodbanks:active');
            // Invalidate all blood type inventories
            const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            for (const type of bloodTypes) {
                await this.cacheManager.delete(`inventory:${type}`);
            }
        }

        if (pattern.includes('appointment')) {
            await this.cacheManager.delete('appointments:upcoming');
            await this.cacheManager.delete('appointments:available');
        }

        if (pattern.includes('user')) {
            await this.cacheManager.delete('user:preferences');
            await this.cacheManager.delete('user:profile');
        }
    }

    // Time-based invalidation
    scheduleInvalidation(key: string, delay: number): void {
        setTimeout(async () => {
            await this.cacheManager.delete(key);
        }, delay);
    }
}

// Global cache instance
export const globalCache = new CacheManager();
export const cacheWarmer = new CacheWarmer(globalCache);
export const cacheInvalidator = new CacheInvalidator(globalCache);

// Initialize cache warming on app start
export function initializeCaching(): void {
    if (typeof window !== 'undefined') {
        // Warm cache after a short delay to not block initial render
        setTimeout(() => {
            cacheWarmer.warmFrequentlyAccessedData();
        }, 2000);
    }
}