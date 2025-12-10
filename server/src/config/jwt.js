/**
 * ============================================
 * JWT Configuration
 * ============================================
 * JSON Web Token settings for authentication
 */

export const jwtConfig = {
    accessToken: {
        secret: process.env.JWT_ACCESS_SECRET || 'trackx-dev-access-secret-key-32chars',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    },
    refreshToken: {
        secret: process.env.JWT_REFRESH_SECRET || 'trackx-dev-refresh-secret-key-32chars',
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    },
};

/**
 * Parse JWT expiry string to seconds
 * @param {string} expiry - Expiry string (e.g., '15m', '7d')
 * @returns {number} Expiry in seconds
 */
export function parseExpiryToSeconds(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: return 900; // 15 minutes default
    }
}

export default jwtConfig;
