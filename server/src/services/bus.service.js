/**
 * ============================================
 * Bus Service
 * ============================================
 * Business logic for bus management
 */

import { prisma } from '../config/database.js';
import { generateApiKey, hashApiKey, paginate, paginatedResponse } from '../utils/helpers.js';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * Get all buses with optional pagination and filtering
 * @param {object} options - Query options
 */
export async function getAllBuses(options = {}) {
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc' } = options;

    // MongoDB compatible search (case-insensitive regex)
    const where = search ? {
        OR: [
            { busNumber: { contains: search } },
            { busName: { contains: search } },
        ],
    } : {};

    const [buses, total] = await Promise.all([
        prisma.bus.findMany({
            where,
            ...paginate(page, limit),
            orderBy: { [sortBy]: sortOrder },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                        photoUrl: true,
                    },
                },
                stops: {
                    orderBy: { order: 'asc' },
                },
            },
        }),
        prisma.bus.count({ where }),
    ]);

    return paginatedResponse(buses, total, page, limit);
}

/**
 * Get a single bus by ID
 * @param {string} id - Bus ID
 */
export async function getBusById(id) {
    const bus = await prisma.bus.findUnique({
        where: { id },
        include: {
            driver: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    photoUrl: true,
                },
            },
            stops: {
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    return bus;
}

/**
 * Get bus by bus number
 * @param {string} busNumber - Bus number
 */
export async function getBusByNumber(busNumber) {
    const bus = await prisma.bus.findUnique({
        where: { busNumber },
        include: {
            driver: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
            stops: {
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    return bus;
}

/**
 * Create a new bus
 * @param {object} data - Bus data
 */
export async function createBus(data) {
    // Normalize bus number to uppercase for consistency
    const normalizedBusNumber = data.busNumber.toUpperCase();

    // Check if bus number already exists
    const existing = await prisma.bus.findUnique({
        where: { busNumber: normalizedBusNumber },
    });

    if (existing) {
        throw new ApiError(409, 'Bus number already exists');
    }

    // If driver is assigned, check availability
    if (data.driverId) {
        const driver = await prisma.driver.findUnique({
            where: { id: data.driverId },
        });

        if (!driver) {
            throw new ApiError(404, 'Driver not found');
        }

        if (driver.busId) {
            throw new ApiError(409, 'Driver is already assigned to another bus');
        }
    }

    const bus = await prisma.bus.create({
        data: {
            busNumber: normalizedBusNumber,
            busName: data.busName,
            gpsDeviceId: data.gpsDeviceId || null,
            isActive: data.isActive ?? true,
            ...(data.driverId && {
                driver: { connect: { id: data.driverId } },
            }),
        },
        include: {
            driver: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
    });

    return bus;
}

/**
 * Update a bus
 * @param {string} id - Bus ID
 * @param {object} data - Update data
 */
export async function updateBus(id, data) {
    const existing = await prisma.bus.findUnique({
        where: { id },
        include: { driver: true },
    });

    if (!existing) {
        throw new ApiError(404, 'Bus not found');
    }

    // Check if new bus number conflicts
    if (data.busNumber && data.busNumber.toUpperCase() !== existing.busNumber.toUpperCase()) {
        const normalizedNewBusNumber = data.busNumber.toUpperCase();
        const conflict = await prisma.bus.findUnique({
            where: { busNumber: normalizedNewBusNumber },
        });
        if (conflict) {
            throw new ApiError(409, 'Bus number already exists');
        }
    }

    // Handle driver assignment update
    let driverUpdate = {};
    if (data.driverId !== undefined) {
        // If changing driver
        if (data.driverId !== existing.driver?.id) {
            // Unassign current driver
            if (existing.driver) {
                await prisma.driver.update({
                    where: { id: existing.driver.id },
                    data: { busId: null },
                });
            }

            // Assign new driver
            if (data.driverId) {
                const newDriver = await prisma.driver.findUnique({
                    where: { id: data.driverId },
                });

                if (!newDriver) {
                    throw new ApiError(404, 'Driver not found');
                }

                if (newDriver.busId && newDriver.busId !== id) {
                    throw new ApiError(409, 'Driver is already assigned to another bus');
                }

                driverUpdate = { driver: { connect: { id: data.driverId } } };
            } else {
                driverUpdate = { driver: { disconnect: true } };
            }
        }
    }

    const bus = await prisma.bus.update({
        where: { id },
        data: {
            ...(data.busNumber && { busNumber: data.busNumber.toUpperCase() }),
            ...(data.busName && { busName: data.busName }),
            ...(data.gpsDeviceId !== undefined && { gpsDeviceId: data.gpsDeviceId }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...driverUpdate,
        },
        include: {
            driver: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            },
        },
    });

    return bus;
}

/**
 * Delete a bus
 * @param {string} id - Bus ID
 */
export async function deleteBus(id) {
    const existing = await prisma.bus.findUnique({
        where: { id },
        include: { driver: true },
    });

    if (!existing) {
        throw new ApiError(404, 'Bus not found');
    }

    // Unassign driver first
    if (existing.driver) {
        await prisma.driver.update({
            where: { id: existing.driver.id },
            data: { busId: null },
        });
    }

    await prisma.bus.delete({
        where: { id },
    });

    return { success: true };
}

/**
 * Generate API key for a bus
 * @param {string} busId - Bus ID
 */
export async function generateBusApiKey(busId) {
    const bus = await prisma.bus.findUnique({
        where: { id: busId },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    await prisma.bus.update({
        where: { id: busId },
        data: {
            apiKey: apiKey, // Store plain key (in production, only store hash)
            apiKeyHash: apiKeyHash,
        },
    });

    return {
        apiKey,
        busNumber: bus.busNumber,
        message: 'Store this API key securely. It will not be shown again.',
    };
}

/**
 * Revoke API key for a bus
 * @param {string} busId - Bus ID
 */
export async function revokeBusApiKey(busId) {
    const bus = await prisma.bus.findUnique({
        where: { id: busId },
    });

    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    await prisma.bus.update({
        where: { id: busId },
        data: {
            apiKey: null,
            apiKeyHash: null,
        },
    });

    return { success: true };
}

/**
 * Update bus stops (replace all stops)
 * @param {string} busId - Bus ID
 * @param {Array} stops - Array of stops
 */
export async function updateBusStops(busId, stops) {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    // Delete existing stops
    await prisma.busStop.deleteMany({ where: { busId } });

    // Create new stops
    if (stops && stops.length > 0) {
        await prisma.busStop.createMany({
            data: stops.map((stop, index) => ({
                busId,
                name: stop.name,
                latitude: stop.latitude,
                longitude: stop.longitude,
                order: stop.order || index + 1,
            })),
        });
    }

    // Return updated bus with stops
    return prisma.bus.findUnique({
        where: { id: busId },
        include: {
            stops: { orderBy: { order: 'asc' } },
        },
    });
}

/**
 * Add a single stop to a bus
 */
export async function addBusStop(busId, stopData) {
    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    // Get max order
    const maxOrder = await prisma.busStop.findFirst({
        where: { busId },
        orderBy: { order: 'desc' },
    });

    const stop = await prisma.busStop.create({
        data: {
            busId,
            name: stopData.name,
            latitude: stopData.latitude,
            longitude: stopData.longitude,
            order: stopData.order || (maxOrder?.order || 0) + 1,
        },
    });

    return stop;
}

/**
 * Delete a bus stop
 */
export async function deleteBusStop(stopId) {
    const stop = await prisma.busStop.findUnique({ where: { id: stopId } });
    if (!stop) {
        throw new ApiError(404, 'Stop not found');
    }

    await prisma.busStop.delete({ where: { id: stopId } });
    return { success: true };
}

export default {
    getAllBuses,
    getBusById,
    getBusByNumber,
    createBus,
    updateBus,
    deleteBus,
    generateBusApiKey,
    revokeBusApiKey,
    updateBusStops,
    addBusStop,
    deleteBusStop,
};

