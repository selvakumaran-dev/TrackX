/**
 * ============================================
 * Organization Routes
 * ============================================
 * Public and admin endpoints for organizations
 */

import { Router } from 'express';
import { z } from 'zod';
import * as OrganizationService from '../services/organization.service.js';
import { authenticate as authMiddleware, requireRole } from '../middlewares/auth.js';
import { validate } from '../utils/validators.js';

const router = Router();

// ============================================
// Zod Schemas
// ============================================

const registerSchema = z.object({
    organizationName: z.string().min(3).max(100),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    contactPhone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    adminName: z.string().min(2).max(50),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(6),
    adminPhone: z.string().optional(),
});

const updateOrgSchema = z.object({
    name: z.string().min(3).max(100).optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
});

// ============================================
// Public Endpoints (No Auth Required)
// ============================================

/**
 * POST /api/organizations/register
 * Register a new organization with admin
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
    try {
        const {
            organizationName, address, city, state, contactPhone, website,
            adminName, adminPassword, adminPhone,
        } = req.body;

        // Normalize email to lowercase
        const adminEmail = req.body.adminEmail?.toLowerCase();

        const result = await OrganizationService.createOrganization(
            {
                name: organizationName,
                address,
                city,
                state,
                contactEmail: adminEmail,
                contactPhone,
                website,
            },
            {
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                phone: adminPhone,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Organization registered successfully! Your join code has been generated.',
            data: {
                organization: {
                    id: result.organization.id,
                    name: result.organization.name,
                    code: result.organization.code,
                    slug: result.organization.slug,
                },
                admin: {
                    id: result.admin.id,
                    name: result.admin.name,
                    email: result.admin.email,
                },
            },
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({
                success: false,
                error: 'An organization with this name or admin email already exists.',
            });
        }
        next(error);
    }
});

/**
 * GET /api/organizations/lookup/:code
 * Look up organization by join code (for students)
 */
router.get('/lookup/:code', async (req, res, next) => {
    try {
        const code = req.params.code.toUpperCase().trim();

        if (!code || code.length < 4) {
            return res.status(400).json({
                success: false,
                error: 'Invalid organization code',
            });
        }

        const organization = await OrganizationService.getOrganizationByCode(code);

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found. Please check the code and try again.',
            });
        }

        res.json({
            success: true,
            data: organization,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/slug/:slug
 * Get organization by URL slug
 */
router.get('/slug/:slug', async (req, res, next) => {
    try {
        const organization = await OrganizationService.getOrganizationBySlug(req.params.slug);

        if (!organization) {
            return res.status(404).json({
                success: false,
                error: 'Organization not found',
            });
        }

        res.json({
            success: true,
            data: organization,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/featured
 * Get featured organizations for landing page
 */
router.get('/featured', async (req, res, next) => {
    try {
        const organizations = await OrganizationService.getFeaturedOrganizations(10);

        res.json({
            success: true,
            data: organizations,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Admin Endpoints (Auth Required)
// ============================================

/**
 * GET /api/organizations/my
 * Get current admin's organization
 */
router.get('/my', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(404).json({
                success: false,
                error: 'No organization associated with this account',
            });
        }

        const organization = await OrganizationService.getOrganizationById(req.user.organizationId);

        res.json({
            success: true,
            data: organization,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/organizations/my/stats
 * Get organization statistics
 */
router.get('/my/stats', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(404).json({
                success: false,
                error: 'No organization associated with this account',
            });
        }

        const stats = await OrganizationService.getOrganizationStats(req.user.organizationId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/organizations/my
 * Update current admin's organization
 */
router.put('/my', authMiddleware, validate(updateOrgSchema), async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(404).json({
                success: false,
                error: 'No organization associated with this account',
            });
        }

        const organization = await OrganizationService.updateOrganization(
            req.user.organizationId,
            req.body
        );

        res.json({
            success: true,
            message: 'Organization updated successfully',
            data: organization,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/organizations/my/regenerate-code
 * Regenerate organization join code
 */
router.post('/my/regenerate-code', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user.organizationId) {
            return res.status(404).json({
                success: false,
                error: 'No organization associated with this account',
            });
        }

        // Only ORG_ADMIN can regenerate code
        if (req.user.role !== 'ORG_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Only organization admins can regenerate the join code',
            });
        }

        const result = await OrganizationService.regenerateOrgCode(req.user.organizationId);

        res.json({
            success: true,
            message: 'Join code regenerated successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Super Admin Endpoints
// ============================================

/**
 * GET /api/organizations
 * Get all organizations (super admin only)
 */
router.get('/', authMiddleware, requireRole('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        const result = await OrganizationService.getAllOrganizations({
            page: parseInt(page),
            limit: Math.min(parseInt(limit) || 20, 100),
            search,
        });

        res.json({
            success: true,
            data: result.organizations,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/organizations/:id/verify
 * Verify organization (super admin only)
 */
router.put('/:id/verify', authMiddleware, requireRole('SUPER_ADMIN'), async (req, res, next) => {
    try {
        const organization = await OrganizationService.verifyOrganization(
            req.params.id,
            req.body.verified !== false
        );

        res.json({
            success: true,
            message: `Organization ${organization.isVerified ? 'verified' : 'unverified'} successfully`,
            data: organization,
        });
    } catch (error) {
        next(error);
    }
});

// Subscription route removed (Now fully free)

export default router;
