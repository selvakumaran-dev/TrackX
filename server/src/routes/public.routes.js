/**
 * ============================================
 * Public Routes - Optimized for Scale
 * ============================================
 * Endpoints for public bus tracking (students)
 * Optimized for 1000+ concurrent users
 */

import { Router } from 'express';
import * as GpsService from '../services/gps.service.js';
import * as BusService from '../services/bus.service.js';
import * as EtaService from '../services/eta.service.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Apply rate limiting to public routes
router.use(rateLimiter);

/**
 * GET /api/public/bus/:busNumber
 * Get current location of a bus
 * Cached for 2 seconds (location updates every 5s anyway)
 */
router.get('/bus/:busNumber', async (req, res, next) => {
    try {
        const { busNumber } = req.params;

        // Sanitize input
        const sanitized = busNumber.trim().toUpperCase().slice(0, 20);

        const location = await GpsService.getBusCurrentLocation(sanitized);

        // Short cache for frequently accessed data
        res.set('Cache-Control', 'public, max-age=2, stale-while-revalidate=5');

        res.json({
            success: true,
            data: location,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/bus/:busNumber/history
 * Get location history of a bus
 */
router.get('/bus/:busNumber/history', async (req, res, next) => {
    try {
        const { busNumber } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);

        const history = await GpsService.getBusLocationHistory(busNumber, limit);

        // Cache history for 10 seconds
        res.set('Cache-Control', 'public, max-age=10');

        res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/buses
 * Get list of all active buses (for search/autocomplete)
 * Cached longer since bus list doesn't change often
 */
router.get('/buses', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 100);
        const search = (req.query.search || '').trim().slice(0, 50);

        const result = await BusService.getAllBuses({
            page,
            limit,
            search,
        });

        // Return simplified list (reduced payload)
        const buses = result.data.map(bus => ({
            busNumber: bus.busNumber,
            busName: bus.busName,
            isActive: bus.isActive,
        }));

        // Cache bus list for 30 seconds (rarely changes)
        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

        res.json({
            success: true,
            data: buses,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/all-locations
 * Get all active bus locations
 * Most expensive endpoint - cached and rate limited
 */
router.get('/all-locations', async (req, res, next) => {
    try {
        const locations = await GpsService.getAllActiveBusLocations();

        // Cache for 3 seconds
        res.set('Cache-Control', 'public, max-age=3, stale-while-revalidate=10');

        res.json({
            success: true,
            data: locations,
            count: locations.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/health
 * Simple health check for load balancers
 */
router.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
        success: true,
        status: 'healthy',
        timestamp: Date.now(),
    });
});

// ============================================
// SMART ETA PREDICTION ENDPOINTS
// ============================================

/**
 * GET /api/public/eta/:busNumber
 * Get smart ETA prediction for a bus to a destination
 * Query params: destLat, destLon (required)
 */
router.get('/eta/:busNumber', async (req, res, next) => {
    try {
        const { busNumber } = req.params;
        const { destLat, destLon } = req.query;

        if (!destLat || !destLon) {
            throw new ApiError(400, 'destLat and destLon are required');
        }

        // Get current bus location
        const location = await GpsService.getBusCurrentLocation(busNumber);

        if (!location || !location.lat || !location.lon) {
            throw new ApiError(404, 'Bus location not available');
        }

        // Get smart ETA prediction
        const eta = await EtaService.predictETA(
            location.busId || busNumber,
            location.lat,
            location.lon,
            parseFloat(destLat),
            parseFloat(destLon),
            location.speed || 0
        );

        res.set('Cache-Control', 'public, max-age=5');
        res.json({
            success: true,
            data: {
                busNumber,
                currentLocation: {
                    lat: location.lat,
                    lon: location.lon,
                    speed: location.speed,
                },
                destination: {
                    lat: parseFloat(destLat),
                    lon: parseFloat(destLon),
                },
                ...eta,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/eta/:busNumber/stops
 * Get smart ETA predictions for all stops on bus route
 */
router.get('/eta/:busNumber/stops', async (req, res, next) => {
    try {
        const { busNumber } = req.params;

        // Get current bus location with stops
        const location = await GpsService.getBusCurrentLocation(busNumber);

        if (!location) {
            throw new ApiError(404, 'Bus not found');
        }

        if (!location.stops || location.stops.length === 0) {
            return res.json({
                success: true,
                data: {
                    busNumber,
                    stops: [],
                    message: 'No stops configured for this bus',
                },
            });
        }

        // If bus is offline, return stops without ETA
        if (!location.lat || !location.lon) {
            const stopsWithoutEta = location.stops.map(stop => ({
                stopId: stop.id,
                stopName: stop.name,
                stopOrder: stop.order,
                eta: null,
                available: false,
                message: 'Bus is offline',
            }));

            return res.json({
                success: true,
                data: {
                    busNumber,
                    isOnline: false,
                    stops: stopsWithoutEta,
                },
            });
        }

        // Get ETA predictions for all stops
        const predictions = await EtaService.predictRouteETAs(
            location.busId || busNumber,
            location.lat,
            location.lon,
            location.speed || 0,
            location.stops
        );

        res.set('Cache-Control', 'public, max-age=5');
        res.json({
            success: true,
            data: {
                busNumber,
                isOnline: location.isOnline,
                currentLocation: {
                    lat: location.lat,
                    lon: location.lon,
                    speed: location.speed,
                },
                stops: predictions,
                trafficForecast: EtaService.getTrafficForecast(),
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/public/traffic-forecast
 * Get traffic predictions for the next 6 hours
 */
router.get('/traffic-forecast', (req, res) => {
    const forecast = EtaService.getTrafficForecast();

    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json({
        success: true,
        data: forecast,
    });
});

export default router;
