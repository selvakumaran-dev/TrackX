/**
 * ============================================
 * Login Rate Limiter Middleware
 * ============================================
 * Strict rate limiting for login endpoints to prevent brute force attacks
 */

// Store login attempts per IP
const loginAttempts = new Map();

// Configuration
const MAX_LOGIN_ATTEMPTS = 5; // Max attempts per window
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 12 * 60 * 1000; // 12 minutes lockout after max attempts

/**
 * Login rate limiter - stricter than general rate limiter
 */
export function loginRateLimiter(req, res, next) {
    const identifier = req.ip;
    const now = Date.now();

    let record = loginAttempts.get(identifier);

    // Initialize or reset expired record
    if (!record || now > record.resetTime) {
        record = {
            count: 0,
            resetTime: now + WINDOW_MS,
            lockedUntil: null,
        };
        loginAttempts.set(identifier, record);
    }

    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
        const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
        return res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please try again later.',
            retryAfter: remainingSeconds,
            lockedUntil: new Date(record.lockedUntil).toISOString(),
        });
    }

    // Increment attempt count
    record.count++;

    // Check if max attempts reached
    if (record.count > MAX_LOGIN_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_MS;

        console.warn(`⚠️ Login rate limit exceeded for IP: ${identifier}`);

        return res.status(429).json({
            success: false,
            error: 'Too many login attempts. Account temporarily locked.',
            retryAfter: Math.ceil(LOCKOUT_MS / 1000),
            lockedUntil: new Date(record.lockedUntil).toISOString(),
        });
    }

    // Set headers
    res.setHeader('X-RateLimit-Limit', MAX_LOGIN_ATTEMPTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_LOGIN_ATTEMPTS - record.count));

    next();
}

/**
 * Clear login attempts on successful login
 */
export function clearLoginAttempts(ip) {
    loginAttempts.delete(ip);
}

/**
 * Clean up old entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttempts.entries()) {
        // Remove if window expired and not locked
        if (now > record.resetTime && (!record.lockedUntil || now > record.lockedUntil)) {
            loginAttempts.delete(key);
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes

export default loginRateLimiter;
