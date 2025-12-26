/**
 * ============================================
 * Driver Service
 * ============================================
 * Business logic for driver management
 */

import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from './auth.service.js';
import { paginate, paginatedResponse } from '../utils/helpers.js';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * Get all drivers with optional pagination and filtering
 * @param {object} options - Query options
 */
export async function getAllDrivers(options = {}) {
    // Note: organizationId should be filtered via relation if scalar is not recognized
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', sortOrder = 'desc', organizationId } = options;

    // MongoDB compatible search
    const where = {
        organizationId: organizationId,
        ...(search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ],
        } : {})
    };

    const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
            where,
            ...paginate(page, limit),
            orderBy: { [sortBy]: sortOrder },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                photoUrl: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                busId: true,
                bus: {
                    select: {
                        id: true,
                        busNumber: true,
                        busName: true,
                    },
                },
            },
        }),
        prisma.driver.count({ where }),
    ]);

    return paginatedResponse(drivers, total, page, limit);
}

/**
 * Get a single driver by ID
 * @param {string} id - Driver ID
 * @param {string} organizationId - Organization ID for security
 */
export async function getDriverById(id, organizationId = null) {
    const driver = await prisma.driver.findUnique({
        where: {
            id,
            ...(organizationId && { organization: { id: organizationId } }),
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            busId: true,
            bus: {
                select: {
                    id: true,
                    busNumber: true,
                    busName: true,
                },
            },
        },
    });

    if (!driver) {
        throw new ApiError(404, 'Driver not found');
    }

    return driver;
}

/**
 * Create a new driver
 * @param {object} data - Driver data
 */
export async function createDriver(data) {
    // Check if email already exists
    const existing = await prisma.driver.findUnique({
        where: { email: data.email },
    });

    if (existing) {
        throw new ApiError(409, 'Email already registered');
    }

    // If bus is assigned, check availability
    if (data.busId) {
        const bus = await prisma.bus.findUnique({
            where: { id: data.busId },
            include: { driver: true },
        });

        if (!bus) {
            throw new ApiError(404, 'Bus not found');
        }

        if (bus.driver) {
            throw new ApiError(409, 'Bus already has a driver assigned');
        }
    }

    const hashedPassword = await hashPassword(data.password);

    const driver = await prisma.driver.create({
        data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            phone: data.phone || null,
            isActive: data.isActive ?? true,
            // Use connect syntax for relation to avoid scalar issues
            ...(data.organizationId && {
                organization: {
                    connect: { id: data.organizationId }
                }
            }),
            ...(data.busId && {
                bus: { connect: { id: data.busId } },
            }),
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            createdAt: true,
            bus: {
                select: {
                    id: true,
                    busNumber: true,
                    busName: true,
                },
            },
        },
    });

    return driver;
}

/**
 * Update a driver
 * @param {string} id - Driver ID
 * @param {object} data - Update data
 * @param {string} organizationId - Organization ID for security
 */
export async function updateDriver(id, data, organizationId = null) {
    const existing = await prisma.driver.findUnique({
        where: {
            id,
            ...(organizationId && { organization: { id: organizationId } }),
        },
    });

    if (!existing) {
        throw new ApiError(404, 'Driver not found');
    }

    // Check if new email conflicts
    if (data.email && data.email !== existing.email) {
        const conflict = await prisma.driver.findUnique({
            where: { email: data.email },
        });
        if (conflict) {
            throw new ApiError(409, 'Email already registered');
        }
    }

    // Handle bus assignment update
    let busUpdate = {};
    if (data.busId !== undefined && data.busId !== existing.busId) {
        if (data.busId) {
            const bus = await prisma.bus.findUnique({
                where: { id: data.busId },
                include: { driver: true },
            });

            if (!bus) {
                throw new ApiError(404, 'Bus not found');
            }

            if (bus.driver && bus.driver.id !== id) {
                throw new ApiError(409, 'Bus already has a driver assigned');
            }

            busUpdate = { bus: { connect: { id: data.busId } } };
        } else {
            busUpdate = { bus: { disconnect: true } };
        }
    }

    // Hash password if provided
    let passwordUpdate = {};
    if (data.password) {
        passwordUpdate = { password: await hashPassword(data.password) };
    }

    const driver = await prisma.driver.update({
        where: { id },
        data: {
            ...(data.email && { email: data.email }),
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            ...passwordUpdate,
            ...busUpdate,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            bus: {
                select: {
                    id: true,
                    busNumber: true,
                    busName: true,
                },
            },
        },
    });

    return driver;
}

/**
 * Update driver profile (self-update)
 * @param {string} id - Driver ID
 * @param {object} data - Update data
 */
export async function updateDriverProfile(id, data) {
    const driver = await prisma.driver.findUnique({
        where: { id },
    });

    if (!driver) {
        throw new ApiError(404, 'Driver not found');
    }

    // Handle password change
    let passwordUpdate = {};
    if (data.newPassword) {
        const isValidPassword = await comparePassword(data.currentPassword, driver.password);
        if (!isValidPassword) {
            throw new ApiError(401, 'Current password is incorrect');
        }
        passwordUpdate = { password: await hashPassword(data.newPassword) };
    }

    const updated = await prisma.driver.update({
        where: { id },
        data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...passwordUpdate,
        },
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            bus: {
                select: {
                    id: true,
                    busNumber: true,
                    busName: true,
                },
            },
        },
    });

    return updated;
}

/**
 * Update driver photo
 * @param {string} id - Driver ID
 * @param {string} photoUrl - Photo URL
 * @param {string} organizationId - Organization ID for security
 */
export async function updateDriverPhoto(id, photoUrl, organizationId = null) {
    // Verify ownership first
    const driverSearch = await prisma.driver.findUnique({
        where: {
            id,
            ...(organizationId && { organizationId }), // Some models use organizationId directly
        }
    });

    if (!driverSearch) {
        throw new ApiError(404, 'Driver not found');
    }

    const driver = await prisma.driver.update({
        where: { id },
        data: { photoUrl },
        select: {
            id: true,
            photoUrl: true,
        },
    });

    return driver;
}

/**
 * Delete a driver
 * @param {string} id - Driver ID
 * @param {string} organizationId - Organization ID for security
 */
export async function deleteDriver(id, organizationId = null) {
    const existing = await prisma.driver.findUnique({
        where: {
            id,
            ...(organizationId && { organization: { id: organizationId } }),
        },
    });

    if (!existing) {
        throw new ApiError(404, 'Driver not found');
    }

    await prisma.driver.delete({
        where: { id },
    });

    return { success: true };
}

/**
 * Get available drivers (not assigned to any bus)
 * @param {string} organizationId - Optional organization filter
 */
export async function getAvailableDrivers(organizationId = null) {
    const where = {
        busId: null,
        isActive: true,
        ...(organizationId && { organization: { id: organizationId } }),
    };

    const drivers = await prisma.driver.findMany({
        where,
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            busId: true,
            bus: {
                select: {
                    id: true,
                    busNumber: true,
                    busName: true,
                },
            },
        },
        orderBy: { name: 'asc' },
    });

    return drivers;
}

export default {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    updateDriverProfile,
    updateDriverPhoto,
    deleteDriver,
    getAvailableDrivers,
};
