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
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', organizationId } = options;

    // MongoDB compatible search (case-insensitive regex)
    const where = {
        organizationId: organizationId, // Strict filter: must match provided ID exactly
        ...(search && {
            OR: [
                { busNumber: { contains: search, mode: 'insensitive' } },
                { busName: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

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
                organization: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        logoUrl: true,
                    },
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
 * @param {string} organizationId - Organization ID for security
 */
export async function getBusById(id, organizationId = null) {
    const bus = await prisma.bus.findUnique({
        where: {
            id,
            ...(organizationId && { organizationId }),
        },
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
export async function getBusByNumber(busNumber, organizationId = null) {
    const where = {
        busNumber: { equals: busNumber, mode: 'insensitive' },
        ...(organizationId && { organizationId }),
    };

    const bus = await prisma.bus.findFirst({
        where,
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
 * @param {string} organizationId - Organization ID (optional)
 */
export async function createBus(data, organizationId = null) {
    // Normalize bus number to uppercase for consistency
    const normalizedBusNumber = data.busNumber.toUpperCase();

    // Check if bus number already exists in this organization
    const existing = await prisma.bus.findFirst({
        where: {
            busNumber: normalizedBusNumber,
            organizationId,
        },
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

        // Verify driver belongs to same organization
        if (organizationId && driver.organizationId !== organizationId) {
            throw new ApiError(403, 'Driver belongs to a different organization');
        }
    }

    // No bus limit (Fully Free Model)

    const bus = await prisma.bus.create({
        data: {
            busNumber: normalizedBusNumber,
            busName: data.busName,
            gpsDeviceId: data.gpsDeviceId || null,
            isActive: data.isActive ?? true,
            organizationId: organizationId,
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
 * @param {string} organizationId - Organization ID for security
 */
export async function updateBus(id, data, organizationId = null) {
    const existing = await prisma.bus.findUnique({
        where: {
            id,
            ...(organizationId && { organizationId }),
        },
        include: { driver: true },
    });

    if (!existing) {
        throw new ApiError(404, 'Bus not found');
    }

    // Check if new bus number conflicts
    if (data.busNumber && data.busNumber.toUpperCase() !== existing.busNumber.toUpperCase()) {
        const normalizedNewBusNumber = data.busNumber.toUpperCase();
        const conflict = await prisma.bus.findFirst({
            where: {
                busNumber: normalizedNewBusNumber,
                organizationId: existing.organizationId,
            },
        });
        if (conflict) {
            throw new ApiError(409, 'Bus number already exists');
        }
    }

    return prisma.$transaction(async (tx) => {
        // Handle driver assignment update
        let driverUpdate = {};
        if (data.driverId !== undefined) {
            // If changing driver
            if (data.driverId !== existing.driver?.id) {
                // Unassign current driver
                if (existing.driver) {
                    await tx.driver.update({
                        where: { id: existing.driver.id },
                        data: { busId: null },
                    });
                }

                // Assign new driver
                if (data.driverId) {
                    const newDriver = await tx.driver.findUnique({
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

        const bus = await tx.bus.update({
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
    });
}

/**
 * Delete a bus
 * @param {string} id - Bus ID
 * @param {string} organizationId - Organization ID for security
 */
export async function deleteBus(id, organizationId = null) {
    const existing = await prisma.bus.findUnique({
        where: {
            id,
            ...(organizationId && { organizationId }),
        },
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
 * @param {string} organizationId - Organization ID for security
 */
export async function generateBusApiKey(busId, organizationId = null) {
    const bus = await prisma.bus.findUnique({
        where: {
            id: busId,
            ...(organizationId && { organizationId }),
        },
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
 * @param {string} organizationId - Organization ID for security
 */
export async function revokeBusApiKey(busId, organizationId = null) {
    const bus = await prisma.bus.findUnique({
        where: {
            id: busId,
            ...(organizationId && { organizationId }),
        },
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
 * @param {string} organizationId - Organization ID for security
 */
export async function updateBusStops(busId, stops, organizationId = null) {
    const bus = await prisma.bus.findUnique({
        where: {
            id: busId,
            ...(organizationId && { organizationId }),
        },
    });
    if (!bus) {
        throw new ApiError(404, 'Bus not found');
    }

    return prisma.$transaction(async (tx) => {
        // Delete existing stops
        await tx.busStop.deleteMany({ where: { busId } });

        // Create new stops
        if (stops && stops.length > 0) {
            await tx.busStop.createMany({
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
        return tx.bus.findUnique({
            where: { id: busId },
            include: {
                stops: { orderBy: { order: 'asc' } },
            },
        });
    });
}

/**
 * Add a single stop to a bus
 * @param {string} busId - Bus ID
 * @param {object} stopData - Stop data
 * @param {string} organizationId - Organization ID for security
 */
export async function addBusStop(busId, stopData, organizationId = null) {
    const bus = await prisma.bus.findUnique({
        where: {
            id: busId,
            ...(organizationId && { organizationId }),
        },
    });
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
 * @param {string} stopId - Stop ID
 * @param {string} organizationId - Organization ID for security
 */
export async function deleteBusStop(stopId, organizationId = null) {
    const stop = await prisma.busStop.findUnique({
        where: { id: stopId },
        include: { bus: true },
    });

    if (!stop) {
        throw new ApiError(404, 'Stop not found');
    }

    // IDOR check
    if (organizationId && stop.bus.organizationId !== organizationId) {
        throw new ApiError(403, 'Unauthorized to delete this stop');
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

