/**
 * ============================================
 * SuperAdmin Routes
 * ============================================
 * Global monitoring and management for system owners
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import * as SuperAdminService from '../services/superadmin.service.js';
import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../services/auth.service.js';

const router = Router();

// Apply authentication and superadmin role check
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

/**
 * PUT /api/superadmin/profile/password
 * Change superadmin password
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

        const admin = await prisma.admin.findUnique({
            where: { id: req.user.id },
        });

        if (!admin) {
            return res.status(404).json({
                success: false,
                error: 'Admin not found',
            });
        }

        const isValid = await comparePassword(currentPassword, admin.password);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect',
            });
        }

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

/**
 * GET /api/superadmin/stats
 * Get global system statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await SuperAdminService.getGlobalSystemStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/organizations
 * Get all registered organizations
 */
router.get('/organizations', async (req, res, next) => {
    try {
        const organizations = await SuperAdminService.getAllOrganizations();
        res.json({ success: true, data: organizations });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/superadmin/organizations
 * Create a new organization
 */
router.post('/organizations', async (req, res, next) => {
    try {
        const organization = await SuperAdminService.createOrganization(req.body);
        res.status(201).json({ success: true, data: organization });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/superadmin/organizations/:id
 * Update an organization
 */
router.put('/organizations/:id', async (req, res, next) => {
    try {
        const organization = await SuperAdminService.updateOrganization(req.params.id, req.body);
        res.json({ success: true, data: organization });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/superadmin/organizations/:id
 * Delete an organization
 */
router.delete('/organizations/:id', async (req, res, next) => {
    try {
        await SuperAdminService.deleteOrganization(req.params.id);
        res.json({ success: true, message: 'Organization deleted successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/trends
 * Get registration trends
 */
router.get('/trends', async (req, res, next) => {
    try {
        const trends = await SuperAdminService.getRegistrationTrends();
        res.json({ success: true, data: trends });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/live-map
 * Get global live map data
 */
router.get('/live-map', async (req, res, next) => {
    try {
        const locations = await SuperAdminService.getGlobalLiveMap();
        res.json({ success: true, data: locations });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/health
 * Get system health metrics
 */
router.get('/health', async (req, res, next) => {
    try {
        const health = await SuperAdminService.getSystemHealth();
        res.json({ success: true, data: health });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/config
 * Get platform configuration
 */
router.get('/config', async (req, res, next) => {
    try {
        const config = await SuperAdminService.getSystemConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /api/superadmin/config
 * Update platform configuration
 */
router.patch('/config', async (req, res, next) => {
    try {
        const config = await SuperAdminService.updateSystemConfig(req.body);
        res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/superadmin/activity
 * Get recent system activity
 */
router.get('/activity', async (req, res, next) => {
    try {
        const activity = await SuperAdminService.getRecentActivity();
        res.json({ success: true, data: activity });
    } catch (error) {
        next(error);
    }
});

export default router;
