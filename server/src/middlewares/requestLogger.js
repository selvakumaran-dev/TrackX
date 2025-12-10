/**
 * ============================================
 * Request Logger Middleware
 * ============================================
 * Logs incoming requests for debugging
 */

/**
 * Log incoming HTTP requests (development only)
 */
export function requestLogger(req, res, next) {
    const start = Date.now();

    // Log request
    console.log(`➡️  ${req.method} ${req.path}`);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
        console.log(`${statusColor} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
}

export default requestLogger;
