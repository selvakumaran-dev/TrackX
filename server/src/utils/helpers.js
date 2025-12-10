/**
 * ============================================
 * Utility Helpers
 * ============================================
 * Common utility functions used across the app
 */

import crypto from 'crypto';

/**
 * Generate a secure random API key
 * @param {number} length - Length of the key
 * @returns {string} API key
 */
export function generateApiKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash an API key for storage
 * @param {string} apiKey - Plain API key
 * @returns {string} Hashed API key
 */
export function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Format date to ISO string or relative time
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    return new Date(date).toISOString();
}

/**
 * Check if a timestamp is within the offline threshold
 * @param {Date|string} lastUpdate - Last update timestamp
 * @param {number} thresholdSeconds - Offline threshold in seconds
 * @returns {boolean} True if online
 */
export function isOnline(lastUpdate, thresholdSeconds = 120) {
    if (!lastUpdate) return false;

    const lastUpdateTime = new Date(lastUpdate).getTime();
    const now = Date.now();
    const diffSeconds = (now - lastUpdateTime) / 1000;

    return diffSeconds <= thresholdSeconds;
}

/**
 * Validate GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
export function isValidGpsCoordinate(lat, lon) {
    // Check types
    if (typeof lat !== 'number' || typeof lon !== 'number') {
        return false;
    }

    // Check for NaN or Infinity
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return false;
    }

    // Check valid ranges
    if (lat < -90 || lat > 90) {
        return false;
    }
    if (lon < -180 || lon > 180) {
        return false;
    }

    // Reject null island (0,0) - common GPS error
    if (lat === 0 && lon === 0) {
        return false;
    }

    return true;
}

/**
 * Paginate query results
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination parameters
 */
export function paginate(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
}

/**
 * Create pagination response
 * @param {object[]} items - Query results
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
export function paginatedResponse(items, total, page, limit) {
    return {
        data: items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        },
    };
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Omit specified keys from an object
 * @param {object} obj - Source object
 * @param {string[]} keys - Keys to omit
 * @returns {object} Object without specified keys
 */
export function omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
}

/**
 * Pick specified keys from an object
 * @param {object} obj - Source object
 * @param {string[]} keys - Keys to pick
 * @returns {object} Object with only specified keys
 */
export function pick(obj, keys) {
    const result = {};
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
}

export default {
    generateApiKey,
    hashApiKey,
    calculateDistance,
    formatDate,
    isOnline,
    isValidGpsCoordinate,
    paginate,
    paginatedResponse,
    sleep,
    omit,
    pick,
};
