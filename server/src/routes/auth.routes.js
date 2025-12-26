/**
 * ============================================
 * Authentication Routes
 * ============================================
 * Login, logout, and token refresh endpoints
 */

import { Router } from 'express';
import { login, refreshAccessToken, logout } from '../services/auth.service.js';
import { authenticate } from '../middlewares/auth.js';
import { validate, loginSchema, refreshTokenSchema } from '../utils/validators.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { loginRateLimiter, clearLoginAttempts } from '../middlewares/loginRateLimiter.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login for Admin or Driver
 * Protected by stricter rate limiting
 */
router.post('/login', loginRateLimiter, validate(loginSchema), async (req, res, next) => {
    try {
        const { password, userType } = req.body;
        const email = req.body.email?.toLowerCase();

        const result = await login(email, password, userType);

        // Clear login attempts on successful login
        clearLoginAttempts(req.ip);

        res.json({
            success: true,
            message: 'Login successful',
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        const result = await refreshAccessToken(refreshToken);

        res.json({
            success: true,
            message: 'Token refreshed',
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke tokens
 */
router.post('/logout', authenticate, async (req, res, next) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1];
        const { refreshToken } = req.body;

        await logout(accessToken, refreshToken);

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res, next) => {
    try {
        const { prisma } = await import('../config/database.js');

        let user;
        if (req.user.type === 'ADMIN' || req.user.type === 'SUPER_ADMIN') {
            user = await prisma.admin.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    lastLoginAt: true,
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });
        } else {
            user = await prisma.driver.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    photoUrl: true,
                    lastLoginAt: true,
                    bus: {
                        select: {
                            id: true,
                            busNumber: true,
                            busName: true,
                        },
                    },
                },
            });
        }

        if (!user) {
            throw new ApiError(404, 'User not found');
        }

        res.json({
            success: true,
            data: {
                ...user,
                type: req.user.type,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
