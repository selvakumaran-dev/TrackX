/**
 * ============================================
 * Driver Routes
 * ============================================
 * Driver profile and location endpoints
 */

import { Router } from 'express';
import { authenticate, requireDriver } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as DriverService from '../services/driver.service.js';
import * as GpsService from '../services/gps.service.js';
import { validate, updateDriverProfileSchema, driverLocationUpdateSchema } from '../utils/validators.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { prisma } from '../config/database.js';
import { getIO } from '../socket/index.js';

const router = Router();

// Apply authentication to all driver routes
router.use(authenticate);
router.use(requireDriver);

// ============================================
// Profile Endpoints
// ============================================

/**
 * GET /api/driver/profile
 * Get current driver profile
 */
router.get('/profile', async (req, res, next) => {
    try {
        const driver = await DriverService.getDriverById(req.user.id);

        res.json({
            success: true,
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/driver/profile
 * Update driver profile
 */
router.put('/profile', validate(updateDriverProfileSchema), async (req, res, next) => {
    try {
        const driver = await DriverService.updateDriverProfile(req.user.id, req.body);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/profile/photo
 * Upload driver photo
 */
router.post('/profile/photo', upload.single('photo'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No photo uploaded',
            });
        }

        const photoUrl = `/uploads/drivers/${req.file.filename}`;
        const driver = await DriverService.updateDriverPhoto(req.user.id, photoUrl);

        res.json({
            success: true,
            message: 'Photo uploaded successfully',
            data: driver,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Assigned Bus Info
// ============================================

/**
 * GET /api/driver/bus
 * Get assigned bus info
 */
router.get('/bus', async (req, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.user.id },
            include: {
                bus: {
                    select: {
                        id: true,
                        busNumber: true,
                        busName: true,
                        apiKey: true,
                        gpsDeviceId: true,
                        isActive: true,
                    },
                },
            },
        });

        if (!driver.bus) {
            throw new ApiError(404, 'No bus assigned to this driver');
        }

        res.json({
            success: true,
            data: driver.bus,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Location Updates (Driver App Tracking)
// ============================================

/**
 * POST /api/driver/location
 * Send location update from driver app
 */
router.post('/location', validate(driverLocationUpdateSchema), async (req, res, next) => {
    try {
        // Get driver's bus
        const driver = await prisma.driver.findUnique({
            where: { id: req.user.id },
            include: {
                bus: true,
            },
        });

        if (!driver.bus) {
            throw new ApiError(400, 'No bus assigned. Cannot send location.');
        }

        // Process GPS update
        const io = getIO();
        const locationData = await GpsService.processGpsUpdate(
            req.body,
            { ...driver.bus, driver: { name: driver.name, phone: driver.phone } },
            driver.id,
            io
        );

        res.json({
            success: true,
            message: 'Location updated',
            data: {
                busNumber: driver.bus.busNumber,
                updatedAt: locationData.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Location History
// ============================================

/**
 * GET /api/driver/location-history
 * Get driver's last 10 location updates
 */
router.get('/location-history', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 500);
        const history = await GpsService.getDriverLocationHistory(req.user.id, limit);

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/driver/history
 * Alias for location-history with higher limits for trip summary
 */
router.get('/history', async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const history = await GpsService.getDriverLocationHistory(req.user.id, limit);

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/driver/tracking-status
 * Get current tracking status
 */
router.get('/tracking-status', async (req, res, next) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.user.id },
            include: {
                bus: {
                    select: {
                        busNumber: true,
                    },
                },
                gpsLogs: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });

        if (!driver.bus) {
            return res.json({
                success: true,
                data: {
                    hasAssignedBus: false,
                    isTracking: false,
                    message: 'No bus assigned',
                },
            });
        }

        const lastLog = driver.gpsLogs[0];
        const isRecentlyActive = lastLog
            && (Date.now() - new Date(lastLog.timestamp).getTime()) < 30000; // 30 seconds

        res.json({
            success: true,
            data: {
                hasAssignedBus: true,
                busNumber: driver.bus.busNumber,
                isTracking: isRecentlyActive,
                lastUpdate: lastLog?.timestamp || null,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
