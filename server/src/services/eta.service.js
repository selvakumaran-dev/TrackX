/**
 * ============================================
 * Smart ETA Prediction Service
 * ============================================
 * ML-inspired ETA predictions using historical patterns
 * 
 * Features:
 * - Time of day patterns (rush hour, off-peak)
 * - Day of week patterns (weekday vs weekend)
 * - Historical speed data per route segment
 * - Traffic factor estimation
 * - Confidence scoring
 */

import { prisma } from '../config/database.js';
import { calculateDistance } from '../utils/helpers.js';

// Speed adjustment factors by hour (0-23)
// Based on typical urban bus traffic patterns
const HOUR_FACTORS = {
    // Night (low traffic)
    0: 1.2, 1: 1.25, 2: 1.3, 3: 1.3, 4: 1.25, 5: 1.15,
    // Morning rush
    6: 0.85, 7: 0.65, 8: 0.55, 9: 0.7, 10: 0.85,
    // Midday
    11: 0.9, 12: 0.8, 13: 0.85, 14: 0.9,
    // Evening rush
    15: 0.75, 16: 0.6, 17: 0.5, 18: 0.55, 19: 0.7,
    // Evening
    20: 0.9, 21: 1.0, 22: 1.1, 23: 1.15,
};

// Day of week factors (0 = Sunday, 6 = Saturday)
const DAY_FACTORS = {
    0: 1.3,  // Sunday - less traffic
    1: 0.85, // Monday
    2: 0.9,  // Tuesday
    3: 0.9,  // Wednesday
    4: 0.9,  // Thursday
    5: 0.8,  // Friday - more traffic
    6: 1.15, // Saturday
};

// Base average bus speed in km/h (when no historical data)
const BASE_SPEED = 25;

// Cache for historical speed data
const speedCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Calculate smart ETA with ML-inspired predictions
 * @param {string} busId - Bus ID
 * @param {number} busLat - Current bus latitude
 * @param {number} busLon - Current bus longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @param {number} currentSpeed - Current bus speed (km/h)
 * @returns {object} ETA prediction with confidence
 */
export async function predictETA(busId, busLat, busLon, destLat, destLon, currentSpeed = 0) {
    // Calculate straight-line distance
    const directDistance = calculateDistance(busLat, busLon, destLat, destLon);

    // Road distance is typically 1.3-1.5x straight line distance
    const ROAD_FACTOR = 1.4;
    const estimatedRoadDistance = directDistance * ROAD_FACTOR;

    // Get current time factors
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const hourFactor = HOUR_FACTORS[hour] || 1.0;
    const dayFactor = DAY_FACTORS[dayOfWeek] || 1.0;

    // Get historical average speed for this bus
    const historicalSpeed = await getHistoricalAverageSpeed(busId);

    // Calculate effective speed
    let effectiveSpeed;
    let confidenceScore;

    if (currentSpeed > 5) {
        // Bus is moving - weight current speed heavily
        effectiveSpeed = currentSpeed * 0.6 + historicalSpeed * 0.4;
        confidenceScore = 0.85;
    } else if (historicalSpeed > 0) {
        // Bus stopped - use historical data
        effectiveSpeed = historicalSpeed;
        confidenceScore = 0.7;
    } else {
        // No data - use base speed
        effectiveSpeed = BASE_SPEED;
        confidenceScore = 0.5;
    }

    // Apply time-based adjustments
    const adjustedSpeed = effectiveSpeed * hourFactor * dayFactor;

    // Ensure minimum speed of 10 km/h
    const finalSpeed = Math.max(adjustedSpeed, 10);

    // Calculate ETA in minutes
    const etaMinutes = Math.round((estimatedRoadDistance / finalSpeed) * 60);

    // Calculate ETA range (±20% for confidence interval)
    const etaMin = Math.round(etaMinutes * 0.8);
    const etaMax = Math.round(etaMinutes * 1.2);

    return {
        eta: etaMinutes,
        etaRange: {
            min: etaMin,
            max: etaMax,
        },
        distance: Math.round(estimatedRoadDistance * 1000), // meters
        effectiveSpeed: Math.round(finalSpeed),
        confidence: confidenceScore,
        factors: {
            hourFactor: hourFactor,
            dayFactor: dayFactor,
            trafficCondition: getTrafficCondition(hourFactor * dayFactor),
        },
        prediction: {
            type: currentSpeed > 5 ? 'REAL_TIME' : (historicalSpeed > 0 ? 'HISTORICAL' : 'ESTIMATED'),
            timestamp: now.toISOString(),
        },
    };
}

/**
 * Get historical average speed for a bus
 * Uses cached data or calculates from GPS logs
 */
async function getHistoricalAverageSpeed(busId) {
    const cacheKey = `speed_${busId}`;
    const cached = speedCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.speed;
    }

    try {
        // Get GPS logs from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const logs = await prisma.gpsLog.findMany({
            where: {
                busId,
                timestamp: { gte: sevenDaysAgo },
                speed: { gt: 5 }, // Only consider moving records
            },
            select: {
                speed: true,
            },
            take: 1000,
        });

        if (logs.length < 10) {
            return BASE_SPEED;
        }

        // Calculate average speed (excluding outliers)
        const speeds = logs.map(l => l.speed).filter(s => s > 0 && s < 100);
        speeds.sort((a, b) => a - b);

        // Use trimmed mean (exclude top/bottom 10%)
        const trimStart = Math.floor(speeds.length * 0.1);
        const trimEnd = Math.floor(speeds.length * 0.9);
        const trimmedSpeeds = speeds.slice(trimStart, trimEnd);

        const avgSpeed = trimmedSpeeds.reduce((a, b) => a + b, 0) / trimmedSpeeds.length;

        // Cache the result
        speedCache.set(cacheKey, {
            speed: avgSpeed,
            timestamp: Date.now(),
        });

        return avgSpeed;
    } catch (error) {
        console.error('Error calculating historical speed:', error);
        return BASE_SPEED;
    }
}

/**
 * Get human-readable traffic condition
 */
function getTrafficCondition(factor) {
    if (factor >= 1.2) return 'LIGHT';
    if (factor >= 0.9) return 'NORMAL';
    if (factor >= 0.7) return 'MODERATE';
    if (factor >= 0.5) return 'HEAVY';
    return 'VERY_HEAVY';
}

/**
 * Predict ETA for all stops on a bus route
 */
export async function predictRouteETAs(busId, busLat, busLon, currentSpeed, stops) {
    const predictions = [];

    for (const stop of stops) {
        const eta = await predictETA(
            busId,
            busLat,
            busLon,
            stop.latitude,
            stop.longitude,
            currentSpeed
        );

        predictions.push({
            stopId: stop.id,
            stopName: stop.name,
            stopOrder: stop.order,
            ...eta,
        });
    }

    return predictions;
}

/**
 * Learn from completed trips to improve predictions
 * Called when a bus completes a route segment
 */
export async function recordTripSegment(busId, fromLat, fromLon, toLat, toLon, actualTimeMinutes) {
    const distance = calculateDistance(fromLat, fromLon, toLat, toLon) * 1.4;
    const actualSpeed = (distance / actualTimeMinutes) * 60;

    // This data could be stored and used for model training
    // For now, we just log it for analysis
    console.log(`📊 Trip segment recorded:`, {
        busId,
        distance: distance.toFixed(2) + 'km',
        actualTime: actualTimeMinutes + 'min',
        avgSpeed: actualSpeed.toFixed(1) + 'km/h',
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
    });

    return {
        distance,
        actualTime: actualTimeMinutes,
        avgSpeed: actualSpeed,
    };
}

/**
 * Get traffic predictions for the next few hours
 */
export function getTrafficForecast() {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay();

    const forecast = [];

    for (let i = 0; i < 6; i++) {
        const hour = (currentHour + i) % 24;
        const hourFactor = HOUR_FACTORS[hour];
        const dayFactor = DAY_FACTORS[dayOfWeek];
        const combinedFactor = hourFactor * dayFactor;

        forecast.push({
            hour,
            time: `${hour.toString().padStart(2, '0')}:00`,
            trafficLevel: getTrafficCondition(combinedFactor),
            speedFactor: Math.round(combinedFactor * 100),
            bestForTravel: combinedFactor >= 0.9,
        });
    }

    return forecast;
}

export default {
    predictETA,
    predictRouteETAs,
    recordTripSegment,
    getTrafficForecast,
};
