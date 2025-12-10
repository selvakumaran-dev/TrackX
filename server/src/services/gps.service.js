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

// Offline threshold in seconds (2 minutes)
const OFFLINE_THRESHOLD = parseInt(process.env.GPS_OFFLINE_THRESHOLD_SECONDS) || 120;

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
    // (laptops/desktops without GPS can have very high accuracy values)
    if (accuracy && accuracy > 10000) {
        console.warn(`⚠️ Low GPS accuracy (${accuracy}m) for bus ${bus.busNumber}`);
    }

    // Create location data
    const locationData = {
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
    };

    // Store in Redis cache
    await setBusLocation(bus.busNumber, locationData);
    console.log(`📍 GPS Update: ${bus.busNumber} @ ${lat.toFixed(4)}, ${lon.toFixed(4)} (${speed} km/h)`);

    // Save to database (optional - can be rate-limited)
    await prisma.gpsLog.create({
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
    });

    // Broadcast to Socket.IO room
    if (io) {
        const roomName = `bus-${bus.busNumber}`;
        io.to(roomName).emit('location-update', locationData);

        // Also emit to global room for admin dashboard
        io.to('admin-dashboard').emit('bus-update', locationData);
    }

    return locationData;
}

/**
 * Get current location of a bus
 * @param {string} busNumber - Bus number
 */
export async function getBusCurrentLocation(busNumber) {
    // Normalize to uppercase for case-insensitive lookup
    const normalizedNumber = busNumber.toUpperCase().trim();

    // Get bus with stops first
    const bus = await prisma.bus.findFirst({
        where: {
            busNumber: {
                equals: normalizedNumber,
                mode: 'insensitive',
            }
        },
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

    // Try Redis cache first for location
    let cachedLocation = await getBusLocation(busNumber);

    let location;
    if (cachedLocation) {
        location = {
            ...cachedLocation,
            isOnline: isOnline(cachedLocation.updatedAt, OFFLINE_THRESHOLD),
            stops: bus.stops,
        };
    } else {
        // Use DB data
        const lastLog = bus.gpsLogs[0];

        if (!lastLog) {
            return {
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
        };

        // Cache location (without stops which are in DB)
        await setBusLocation(busNumber, {
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
        });
    }

    return location;
}

/**
 * Get all active bus locations
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
 * @param {number} limit - Number of records
 */
export async function getBusLocationHistory(busNumber, limit = 10) {
    const bus = await prisma.bus.findUnique({
        where: { busNumber },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
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
 */
export async function getDashboardStats() {
    // Get active drivers (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [totalBuses, totalDrivers, activeDrivers, activeLocations] = await Promise.all([
        prisma.bus.count({ where: { isActive: true } }),
        prisma.driver.count({ where: { isActive: true } }),
        prisma.driver.count({
            where: {
                isActive: true,
                lastLoginAt: { gte: twentyFourHoursAgo }
            }
        }),
        getAllBusLocations(),
    ]);

    // Count online/offline buses
    const now = Date.now();
    let onlineBuses = 0;
    let offlineBuses = 0;

    activeLocations.forEach(loc => {
        if (isOnline(loc.updatedAt, OFFLINE_THRESHOLD)) {
            onlineBuses++;
        } else {
            offlineBuses++;
        }
    });

    // Buses without any location data
    const busesWithoutLocation = totalBuses - activeLocations.length;
    offlineBuses += busesWithoutLocation;

    return {
        totalBuses,
        totalDrivers,
        activeDrivers,      // Drivers who logged in last 24h
        onlineBuses,        // Buses currently sending GPS
        offlineBuses,
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Get detailed bus status list
 */
export async function getBusStatusList() {
    const buses = await prisma.bus.findMany({
        where: { isActive: true },
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
    const locationMap = new Map(locations.map(loc => [loc.busNumber, loc]));

    const statusList = buses.map(bus => {
        const location = locationMap.get(bus.busNumber);

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
