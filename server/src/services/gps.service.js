/**
 * ============================================
 * GPS Service
 * ============================================
 * Business logic for GPS updates and tracking
 */

import { prisma } from '../config/database.js';
import { setBusLocation, getBusLocation, getAllBusLocations } from '../config/redis.js';
import { isOnline, isValidGpsCoordinate } from '../utils/helpers.js';
import { ApiError } from '../middlewares/errorHandler.js';

// Offline threshold in seconds (30 seconds - accommodates for network jitter and signal drops)
const OFFLINE_THRESHOLD = parseInt(process.env.GPS_OFFLINE_THRESHOLD_SECONDS) || 30;

/**
 * Get global statistics for landing page
 */
export async function getGlobalStats() {
    const [totalBuses, activeLocations] = await Promise.all([
        prisma.bus.count({
            where: {
                isActive: true,
                organization: {
                    isVerified: true,
                    isActive: true
                }
            }
        }),
        getAllBusLocations(),
    ]);

    const onlineBuses = activeLocations.filter(loc =>
        isOnline(loc.updatedAt, OFFLINE_THRESHOLD)
    ).length;

    return {
        totalBuses,
        onlineBuses,
    };
}

/**
 * Process GPS update from device or driver app
 * @param {object} data - GPS data
 * @param {object} bus - Bus object
 * @param {string|null} driverId - Driver ID (if from driver app)
 * @param {object} io - Socket.IO instance
 */
export async function processGpsUpdate(data, bus, driverId = null, io = null) {
    const { lat, lon, speed = 0, heading, accuracy, altitude, timestamp } = data;

    // Validate GPS coordinates
    if (!isValidGpsCoordinate(lat, lon)) {
        throw new ApiError(400, 'Invalid GPS coordinates');
    }

    // Log warning for inaccurate readings but don't block them
    if (accuracy && accuracy > 10000) {
        console.warn(`⚠️ Low GPS accuracy (${accuracy}m) for bus ${bus.busNumber}`);
    }

    // Create location data
    const locationData = {
        busId: bus.id, // Add busId for uniqueness
        busNumber: bus.busNumber,
        busName: bus.busName,
        lat,
        lon,
        speed,
        heading: heading || null,
        accuracy: accuracy || null,
        altitude: altitude || null,
        driver: bus.driver?.name || null,
        driverPhone: bus.driver?.phone || null,
        source: driverId ? 'DRIVER_APP' : 'DEVICE',
        updatedAt: new Date().toISOString(), // Always use current time
        isOnline: true,
        organizationId: bus.organizationId, // Add orgId for filtering
    };

    // Store in Redis cache using ID to prevent collision
    await setBusLocation(bus.id, locationData);
    console.log(`📍 GPS Update: ${bus.busNumber} @ ${lat.toFixed(4)}, ${lon.toFixed(4)} (${speed} km/h)`);

    // Save to database (in background for zero-latency socket updates)
    prisma.gpsLog.create({
        data: {
            latitude: lat,
            longitude: lon,
            speed,
            heading,
            accuracy,
            altitude,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            source: driverId ? 'DRIVER_APP' : 'DEVICE',
            busId: bus.id,
            driverId: driverId || bus.driver?.id || null,
        },
    }).catch(err => console.error('📍 GPS Log Error:', err));

    // Broadcast to Socket.IO
    if (io) {
        // Broadcast to bus-specific room (using ID for uniqueness)
        const busRoom = `bus-${bus.id}`;
        io.to(busRoom).emit('location-update', locationData);

        // Broadcast to organization-specific admin dashboard
        const adminRoom = `admin-dashboard-${bus.organizationId}`;
        io.to(adminRoom).emit('bus-update', locationData);
    }

    return locationData;
}

/**
 * Stop tracking for a bus (explicitly set offline)
 * @param {string} busId - Bus ID
 * @param {object} io - Socket.IO instance
 */
export async function stopTracking(busId, io = null) {
    const cachedLocation = await getBusLocation(busId);
    if (!cachedLocation) return;

    const locationData = {
        ...cachedLocation,
        isOnline: false,
        updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago to ensure offline
    };

    // Store updated data in Redis
    await setBusLocation(busId, locationData);

    // Broadcast to Socket.IO
    if (io) {
        const busRoom = `bus-${busId}`;
        io.to(busRoom).emit('location-update', locationData);

        const adminRoom = `admin-dashboard-${cachedLocation.organizationId}`;
        io.to(adminRoom).emit('bus-update', locationData);
    }

    console.log(`⏹️ Tracking Stopped: ${cachedLocation.busNumber}`);
}

/**
 * Get current location of a bus
 * @param {string} busNumber - Bus number
 * @param {string} organizationId - Optional organization filter
 */
export async function getBusCurrentLocation(busNumber, organizationId = null) {
    // Normalize to uppercase for case-insensitive lookup
    const normalizedNumber = busNumber.toUpperCase().trim();

    const where = {
        busNumber: {
            equals: normalizedNumber,
            mode: 'insensitive',
        },
        ...(organizationId && { organizationId }),
    };

    // Get bus with stops first
    const bus = await prisma.bus.findFirst({
        where,
        include: {
            driver: {
                select: {
                    name: true,
                    phone: true,
                },
            },
            stops: {
                orderBy: { order: 'asc' },
            },
            gpsLogs: {
                orderBy: { timestamp: 'desc' },
                take: 1,
            },
        },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    // Try Redis cache first using ID
    let cachedLocation = await getBusLocation(bus.id);

    let location;
    if (cachedLocation) {
        location = {
            ...cachedLocation,
            isOnline: isOnline(cachedLocation.updatedAt, OFFLINE_THRESHOLD),
            stops: bus.stops,
            busId: bus.id, // Ensure busId is present
        };
    } else {
        // Use DB data
        const lastLog = bus.gpsLogs[0];

        if (!lastLog) {
            return {
                busId: bus.id,
                busNumber: bus.busNumber,
                busName: bus.busName,
                lat: null,
                lon: null,
                speed: null,
                driver: bus.driver?.name || null,
                updatedAt: null,
                isOnline: false,
                stops: bus.stops,
                message: 'No location data available',
            };
        }

        location = {
            busId: bus.id,
            busNumber: bus.busNumber,
            busName: bus.busName,
            lat: lastLog.latitude,
            lon: lastLog.longitude,
            speed: lastLog.speed,
            heading: lastLog.heading,
            driver: bus.driver?.name || null,
            driverPhone: bus.driver?.phone || null,
            source: lastLog.source,
            updatedAt: lastLog.timestamp.toISOString(),
            isOnline: isOnline(lastLog.timestamp, OFFLINE_THRESHOLD),
            stops: bus.stops,
            organizationId: bus.organizationId,
        };

        // Cache location
        await setBusLocation(bus.id, {
            busId: location.busId,
            busNumber: location.busNumber,
            busName: location.busName,
            lat: location.lat,
            lon: location.lon,
            speed: location.speed,
            heading: location.heading,
            driver: location.driver,
            driverPhone: location.driverPhone,
            source: location.source,
            updatedAt: location.updatedAt,
            organizationId: location.organizationId,
        });
    }

    return location;
}

/**
 * Get all active bus locations for an organization
 * @param {string} organizationId - Organization ID
 */
export async function getOrganizationBusLocations(organizationId) {
    if (!organizationId) return [];

    // Get all cached locations
    const allLocations = await getAllBusLocations();

    // Filter by organization and enhance with online status
    return allLocations
        .filter(loc => loc.organizationId === organizationId)
        .map(loc => ({
            ...loc,
            isOnline: isOnline(loc.updatedAt, OFFLINE_THRESHOLD),
        }));
}

/**
 * Get all active bus locations (System-wide - Internal/SuperAdmin use only)
 */
export async function getAllActiveBusLocations() {
    // Get from Redis
    const cachedLocations = await getAllBusLocations();

    // Enhance with online status
    const locations = cachedLocations.map(loc => ({
        ...loc,
        isOnline: isOnline(loc.updatedAt, OFFLINE_THRESHOLD),
    }));

    return locations;
}

/**
 * Get location history for a bus
 * @param {string} busNumber - Bus number
 * @param {string} organizationId - Organization ID for security & uniqueness
 * @param {number} limit - Number of records
 */
export async function getBusLocationHistory(busNumber, organizationId, limit = 10) {
    if (!organizationId) {
        throw new ApiError(400, 'Organization ID is required for history lookup');
    }

    const bus = await prisma.bus.findFirst({
        where: {
            busNumber: { equals: busNumber.toUpperCase(), mode: 'insensitive' },
            organizationId,
        },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found in this organization');
    }

    const history = await prisma.gpsLog.findMany({
        where: { busId: bus.id },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
            id: true,
            latitude: true,
            longitude: true,
            speed: true,
            heading: true,
            accuracy: true,
            source: true,
            timestamp: true,
        },
    });

    return history;
}

/**
 * Get driver's location history
 * @param {string} driverId - Driver ID
 * @param {number} limit - Number of records
 */
export async function getDriverLocationHistory(driverId, limit = 10) {
    const history = await prisma.gpsLog.findMany({
        where: { driverId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
            id: true,
            latitude: true,
            longitude: true,
            speed: true,
            accuracy: true,
            timestamp: true,
            bus: {
                select: {
                    busNumber: true,
                    busName: true,
                },
            },
        },
    });

    return history;
}

/**
 * Get dashboard statistics
 * @param {string} organizationId - Optional organization filter
 */
export async function getDashboardStats(organizationId = null) {
    // Get active drivers (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const where = { organizationId: organizationId, isActive: true };

    const [totalBuses, totalDrivers, activeDrivers, activeLocations] = await Promise.all([
        prisma.bus.count({ where }),
        prisma.driver.count({ where }),
        prisma.driver.count({
            where: {
                ...where,
                lastLoginAt: { gte: twentyFourHoursAgo }
            }
        }),
        getAllBusLocations(),
    ]);

    // Calculate online buses using Bus IDs
    let validBusIds = null;
    if (organizationId !== undefined) {
        const orgBuses = await prisma.bus.findMany({
            where: { organizationId: organizationId, isActive: true },
            select: { id: true }
        });
        validBusIds = new Set(orgBuses.map(b => b.id));
    }

    let onlineBuses = 0;

    // Filter active locations
    const relevantLocations = organizationId
        ? activeLocations.filter(loc => validBusIds && validBusIds.has(loc.busId))
        : activeLocations;

    relevantLocations.forEach(loc => {
        if (isOnline(loc.updatedAt, OFFLINE_THRESHOLD)) {
            onlineBuses++;
        }
    });

    const offlineBuses = Math.max(0, totalBuses - onlineBuses);

    return {
        totalBuses,
        totalDrivers,
        activeDrivers,
        onlineBuses,
        offlineBuses,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Get detailed bus status list
 * @param {string} organizationId - Optional organization filter
 */
export async function getBusStatusList(organizationId = null) {
    const where = { organizationId: organizationId, isActive: true };

    const buses = await prisma.bus.findMany({
        where,
        include: {
            driver: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
        orderBy: { busNumber: 'asc' },
    });

    const locations = await getAllBusLocations();
    // Use busId for maping to handle duplicate bus numbers
    const locationMap = new Map(locations.map(loc => [loc.busId, loc]));

    const statusList = buses.map(bus => {
        const location = locationMap.get(bus.id);

        return {
            id: bus.id,
            busNumber: bus.busNumber,
            busName: bus.busName,
            driver: bus.driver?.name || null,
            driverPhone: bus.driver?.phone || null,
            lat: location?.lat || null,
            lon: location?.lon || null,
            speed: location?.speed || null,
            lastUpdate: location?.updatedAt || null,
            isOnline: location ? isOnline(location.updatedAt, OFFLINE_THRESHOLD) : false,
        };
    });

    return statusList;
}

export default {
    processGpsUpdate,
    getBusCurrentLocation,
    getAllActiveBusLocations,
    getBusLocationHistory,
    getDriverLocationHistory,
    getDashboardStats,
    getBusStatusList,
};
