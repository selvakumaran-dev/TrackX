/**
 * ============================================
 * Redis Client Configuration
 * ============================================
 * Handles connection, caching operations,
 * and live bus coordinate storage
 * Falls back to in-memory storage if Redis unavailable
 */

import Redis from 'ioredis';
import { config } from './env.js';

let redisClient = null;
let useMemoryFallback = false;

// In-memory fallback storage
const memoryCache = new Map();

/**
 * Connect to Redis server
 * @returns {Promise<Redis|null>} Redis client instance
 */
export async function connectRedis() {
    // Skip Redis if configured or no URL provided
    if (config.redis.skip || !config.redis.url) {
        console.log('⚠️  Redis skipped - using in-memory cache');
        useMemoryFallback = true;
        return null;
    }

    try {
        redisClient = new Redis(config.redis.url, {
            maxRetriesPerRequest: 1,
            retryStrategy: (times) => {
                if (times > 2) {
                    console.warn('⚠️  Redis unavailable - using in-memory cache');
                    useMemoryFallback = true;
                    return null; // Stop retrying
                }
                return Math.min(times * 100, 1000);
            },
            lazyConnect: true,
            enableOfflineQueue: false,
            // TLS support for Upstash and other cloud Redis
            tls: config.redis.url.startsWith('rediss://') ? {} : undefined,
        });

        redisClient.on('error', () => {
            if (!useMemoryFallback) {
                useMemoryFallback = true;
            }
        });

        redisClient.on('connect', () => {
            console.log('🔴 Redis connected');
            useMemoryFallback = false;
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.warn('⚠️  Redis unavailable - using in-memory cache');
        useMemoryFallback = true;
        redisClient = null;
        return null;
    }
}

/**
 * Get the Redis client instance
 */
export function getRedisClient() {
    return redisClient;
}

// ============================================
// Bus Location Cache Operations
// ============================================

const BUS_LOCATION_PREFIX = 'bus:location:';
const BUS_LOCATION_TTL = 300000; // 5 minutes in ms

/**
 * Store bus location
 */
export async function setBusLocation(busNumber, locationData) {
    const key = `${BUS_LOCATION_PREFIX}${busNumber}`;
    const data = { ...locationData, cachedAt: new Date().toISOString() };

    if (redisClient && !useMemoryFallback) {
        try {
            await redisClient.setex(key, 300, JSON.stringify(data));
            return;
        } catch (e) { /* fallback to memory */ }
    }

    // Memory fallback
    memoryCache.set(key, { data, expiry: Date.now() + BUS_LOCATION_TTL });
}

/**
 * Get bus location
 */
export async function getBusLocation(busNumber) {
    const key = `${BUS_LOCATION_PREFIX}${busNumber}`;

    if (redisClient && !useMemoryFallback) {
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (e) { /* fallback to memory */ }
    }

    // Memory fallback
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
        return cached.data;
    }
    memoryCache.delete(key);
    return null;
}

/**
 * Get all cached bus locations
 */
export async function getAllBusLocations() {
    if (redisClient && !useMemoryFallback) {
        try {
            const keys = await redisClient.keys(`${BUS_LOCATION_PREFIX}*`);
            if (keys.length === 0) return [];
            const values = await redisClient.mget(keys);
            return values.filter(Boolean).map(v => JSON.parse(v));
        } catch (e) { /* fallback to memory */ }
    }

    // Memory fallback
    const results = [];
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
        if (key.startsWith(BUS_LOCATION_PREFIX) && cached.expiry > now) {
            results.push(cached.data);
        }
    }
    return results;
}

/**
 * Delete bus location from cache
 */
export async function deleteBusLocation(busNumber) {
    const key = `${BUS_LOCATION_PREFIX}${busNumber}`;

    if (redisClient && !useMemoryFallback) {
        try { await redisClient.del(key); return; } catch (e) { }
    }
    memoryCache.delete(key);
}

// ============================================
// Token Blacklist Operations
// ============================================

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

/**
 * Add token to blacklist (for logout)
 */
export async function blacklistToken(token, expiresIn) {
    const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

    if (redisClient && !useMemoryFallback) {
        try { await redisClient.setex(key, expiresIn, '1'); return; } catch (e) { }
    }
    memoryCache.set(key, { data: '1', expiry: Date.now() + expiresIn * 1000 });
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(token) {
    const key = `${TOKEN_BLACKLIST_PREFIX}${token}`;

    if (redisClient && !useMemoryFallback) {
        try { return (await redisClient.exists(key)) === 1; } catch (e) { }
    }

    const cached = memoryCache.get(key);
    return cached && cached.expiry > Date.now();
}

// Cleanup expired memory cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, cached] of memoryCache.entries()) {
        if (cached.expiry <= now) memoryCache.delete(key);
    }
}, 60000);

export default redisClient;
