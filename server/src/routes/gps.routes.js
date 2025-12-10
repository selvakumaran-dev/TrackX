/**
 * ============================================
 * GPS Routes
 * ============================================
 * Endpoints for GPS device updates
 */

import { Router } from 'express';
import { authenticateBusApiKey } from '../middlewares/auth.js';
import * as GpsService from '../services/gps.service.js';
import { validate, gpsUpdateSchema } from '../utils/validators.js';
import { getIO } from '../socket/index.js';

const router = Router();

/**
 * POST /api/gps/update
 * Receive GPS update from hardware device
 * Requires Bus API key authentication
 */
router.post('/update', authenticateBusApiKey, validate(gpsUpdateSchema), async (req, res, next) => {
    try {
        const io = getIO();

        const locationData = await GpsService.processGpsUpdate(
            req.body,
            req.bus,
            null, // No driver ID for hardware GPS
            io
        );

        res.json({
            success: true,
            message: 'Location updated',
            data: {
                busNumber: req.bus.busNumber,
                updatedAt: locationData.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/gps/status
 * Health check for GPS endpoint
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'GPS endpoint operational',
        timestamp: new Date().toISOString(),
    });
});

export default router;
