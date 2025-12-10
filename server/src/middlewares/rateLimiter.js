/**
 * ============================================
 * Rate Limiter Middleware
 * ============================================
 * Prevents abuse of GPS and API endpoints
 */

const requestCounts = new Map();

/**
 * Simple in-memory rate limiter
 * Use Redis-based rate limiting in production for distributed systems
 */
export function rateLimiter(req, res, next) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    // Use IP + user agent as identifier
    const identifier = `${req.ip}-${req.get('user-agent')?.slice(0, 50) || 'unknown'}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request record
    let record = requestCounts.get(identifier);

    if (!record) {
        record = { count: 0, resetTime: now + windowMs };
        requestCounts.set(identifier, record);
    }

    // Reset if window expired
    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
    }

    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);

    // Check if limit exceeded
    if (record.count > maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests',
            retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
    }

    next();
}

/**
 * Clean up old entries periodically (every 5 minutes)
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
        if (now > record.resetTime + 60000) { // 1 minute grace period
            requestCounts.delete(key);
        }
    }
}, 5 * 60 * 1000);

export default rateLimiter;
