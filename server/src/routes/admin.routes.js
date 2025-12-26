/**
 * ============================================
 * Admin Routes
 * ============================================
 * Bus and driver management for admins
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as BusService from '../services/bus.service.js';
import * as DriverService from '../services/driver.service.js';
import * as GpsService from '../services/gps.service.js';
import {
    validate,
    validateQuery,
    createBusSchema,
    updateBusSchema,
    createDriverSchema,
    updateDriverSchema,
    paginationSchema,
} from '../utils/validators.js';

const router = Router();

// Apply authentication to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// ============================================
// Dashboard Endpoints
// ============================================

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', async (req, res, next) => {
    try {
        const stats = await GpsService.getDashboardStats(req.user.organizationId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/dashboard/buses
 * Get detailed bus status list
 */
router.get('/dashboard/buses', async (req, res, next) => {
    try {
        const buses = await GpsService.getBusStatusList(req.user.organizationId);

        res.json({
            success: true,
            data: buses,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Admin Profile Endpoints
// ============================================

/**
 * PUT /api/admin/profile/password
 * Change admin password
 */
router.put('/profile/password', async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current and new password are required',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters',
            });
        }

        // Get admin from database
        const { prisma } = await import('../config/database.js');
        const { hashPassword, comparePassword } = await import('../services/auth.service.js');

        const admin = await prisma.admin.findUnique({
            where: { id: req.user.id },
        });

        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found',
            });
        }

        // Verify current password
        const isValid = await comparePassword(currentPassword, admin.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect',
            });
        }

        // Update password
        const hashedPassword = await hashPassword(newPassword);
        await prisma.admin.update({
            where: { id: req.user.id },
            data: { password: hashedPassword },
        });

        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Bus Management Endpoints
// ============================================

/**
 * GET /api/admin/buses
 * Get all buses with pagination (scoped by organization)
 */
router.get('/buses', validateQuery(paginationSchema), async (req, res, next) => {
    try {
        console.log('DEBUG: GET /admin/buses');
        console.log('User Org ID:', req.user.organizationId);
        console.log('Query:', req.query);

        const result = await BusService.getAllBuses({
            ...req.query,
            organizationId: req.user.organizationId,
        });

        console.log('Found buses:', result.data.length);

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/buses/:id
 * Get a single bus by ID
 */
router.get('/buses/:id', async (req, res, next) => {
    try {
        const bus = await BusService.getBusById(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            data: bus,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/buses
 * Create a new bus (assigned to admin's organization)
 */
router.post('/buses', validate(createBusSchema), async (req, res, next) => {
    try {
        const bus = await BusService.createBus(req.body, req.user.organizationId);

        res.status(201).json({
            success: true,
            message: 'Bus created successfully',
            data: bus,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/buses/:id
 * Update a bus
 */
router.put('/buses/:id', validate(updateBusSchema), async (req, res, next) => {
    try {
        const bus = await BusService.updateBus(req.params.id, req.body, req.user.organizationId);

        res.json({
            success: true,
            message: 'Bus updated successfully',
            data: bus,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/buses/:id
 * Delete a bus
 */
router.delete('/buses/:id', async (req, res, next) => {
    try {
        await BusService.deleteBus(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            message: 'Bus deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/buses/:id/generate-api-key
 * Generate API key for a bus
 */
router.post('/buses/:id/generate-api-key', async (req, res, next) => {
    try {
        const result = await BusService.generateBusApiKey(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            message: 'API key generated successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/buses/:id/revoke-api-key
 * Revoke API key for a bus
 */
router.delete('/buses/:id/revoke-api-key', async (req, res, next) => {
    try {
        await BusService.revokeBusApiKey(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            message: 'API key revoked successfully',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Bus Stops Management
// ============================================

/**
 * PUT /api/admin/buses/:id/stops
 * Update all stops for a bus
 */
router.put('/buses/:id/stops', async (req, res, next) => {
    try {
        const { stops } = req.body;
        const bus = await BusService.updateBusStops(req.params.id, stops || [], req.user.organizationId);

        res.json({
            success: true,
            message: 'Stops updated successfully',
            data: bus,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/buses/:id/stops
 * Add a single stop to a bus
 */
router.post('/buses/:id/stops', async (req, res, next) => {
    try {
        const stop = await BusService.addBusStop(req.params.id, req.body, req.user.organizationId);

        res.status(201).json({
            success: true,
            message: 'Stop added successfully',
            data: stop,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/stops/:stopId
 * Delete a bus stop
 */
router.delete('/stops/:stopId', async (req, res, next) => {
    try {
        await BusService.deleteBusStop(req.params.stopId, req.user.organizationId);

        res.json({
            success: true,
            message: 'Stop deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Driver Management Endpoints
// ============================================

/**
 * GET /api/admin/drivers
 * Get all drivers with pagination
 */
router.get('/drivers', validateQuery(paginationSchema), async (req, res, next) => {
    try {
        const result = await DriverService.getAllDrivers({
            ...req.query,
            organizationId: req.user.organizationId,
        });

        res.json({
            success: true,
            ...result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/drivers/available
 * Get available drivers (not assigned to any bus)
 */
router.get('/drivers/available', async (req, res, next) => {
    try {
        const drivers = await DriverService.getAvailableDrivers(req.user.organizationId);

        res.json({
            success: true,
            data: drivers,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/drivers/:id
 * Get a single driver by ID
 */
router.get('/drivers/:id', async (req, res, next) => {
    try {
        const driver = await DriverService.getDriverById(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/drivers
 * Create a new driver
 */
router.post('/drivers', validate(createDriverSchema), async (req, res, next) => {
    try {
        const driver = await DriverService.createDriver({
            ...req.body,
            organizationId: req.user.organizationId,
        });

        res.status(201).json({
            success: true,
            message: 'Driver created successfully',
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/admin/drivers/:id
 * Update a driver
 */
router.put('/drivers/:id', validate(updateDriverSchema), async (req, res, next) => {
    try {
        const driver = await DriverService.updateDriver(req.params.id, req.body, req.user.organizationId);

        res.json({
            success: true,
            message: 'Driver updated successfully',
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/drivers/:id/photo
 * Upload driver photo
 */
router.post('/drivers/:id/photo', upload.single('photo'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No photo uploaded',
            });
        }

        const photoUrl = `/uploads/drivers/${req.file.filename}`;
        const driver = await DriverService.updateDriverPhoto(req.params.id, photoUrl, req.user.organizationId);

        res.json({
            success: true,
            message: 'Photo uploaded successfully',
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/admin/drivers/:id
 * Delete a driver
 */
router.delete('/drivers/:id', async (req, res, next) => {
    try {
        await DriverService.deleteDriver(req.params.id, req.user.organizationId);

        res.json({
            success: true,
            message: 'Driver deleted successfully',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
