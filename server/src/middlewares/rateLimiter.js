/**
 * ============================================
 * Rate Limiter Middleware
 * ============================================
 * Prevents abuse of GPS and API endpoints
 * Optimized for memory efficiency
 */

/**
 * @typedef {Object} RateLimitRecord
 * @property {number} count - Number of requests
 * @property {number} resetTime - Time when count resets
 */

/** @type {Map<string, { count: number; resetTime: number }>} */
const requestCounts = new Map();

// Track memory usage
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60000; // 1 minute
const MAX_ENTRIES = 10000; // Prevent unbounded growth

/**
 * Simple in-memory rate limiter with memory bounds
 * Use Redis-based rate limiting in production for distributed systems
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function rateLimiter(req, res, next) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    // Use IP + path as identifier for more granular limiting
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path.split('/')[2] || 'general'; // e.g., "auth", "driver", "admin"
    const identifier = `${ip}:${path}`;

    const now = Date.now();

    // Inline cleanup if too many entries (prevents memory leak)
    if (requestCounts.size > MAX_ENTRIES || now - lastCleanup > CLEANUP_INTERVAL) {
        cleanupExpiredEntries(now);
        lastCleanup = now;
    }

    // Get or create request record
    let record = requestCounts.get(identifier);

    if (!record || now > record.resetTime) {
        // Create new record or reset expired one
        record = { count: 1, resetTime: now + windowMs };
        requestCounts.set(identifier, record);
    } else {
        record.count++;
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    // Check if limit exceeded
    if (record.count > maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
            success: false,
            error: 'Too many requests',
            retryAfter,
        });
    }

    next();
}

/**
 * Clean up expired entries to prevent memory leaks
 * @param {number} now - Current timestamp
 */
function cleanupExpiredEntries(now) {
    let deleted = 0;
    for (const [key, record] of requestCounts.entries()) {
        if (now > record.resetTime + 60000) { // 1 minute grace period
            requestCounts.delete(key);
            deleted++;
        }
    }
    if (deleted > 0 && process.env.NODE_ENV === 'development') {
        console.log(`🧹 Rate limiter cleanup: removed ${deleted} expired entries, ${requestCounts.size} remaining`);
    }
}

/**
 * Get current rate limiter stats (for monitoring)
 * @returns {{ entries: number; maxEntries: number }}
 */
export function getRateLimiterStats() {
    return {
        entries: requestCounts.size,
        maxEntries: MAX_ENTRIES,
    };
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimits() {
    requestCounts.clear();
}

// Periodic cleanup every 5 minutes (backup)
setInterval(() => {
    const now = Date.now();
    cleanupExpiredEntries(now);
}, 5 * 60 * 1000);

export default rateLimiter;
