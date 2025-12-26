/**
 * ============================================
 * Authentication Middleware
 * ============================================
 * JWT verification for protected routes
 */

import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { isTokenBlacklisted } from '../config/redis.js';
import { ApiError } from './errorHandler.js';
import { prisma } from '../config/database.js';

/**
 * Authenticate JWT token from Authorization header
 * Adds user info to req.user including organization
 */
export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Access token required');
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            throw new ApiError(401, 'Token has been revoked');
        }

        // Verify token
        const decoded = jwt.verify(token, jwtConfig.accessToken.secret);

        // Fetch full user data with organization
        if (decoded.userType === 'ADMIN' || decoded.userType === 'SUPER_ADMIN') {
            const admin = await prisma.admin.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    organizationId: true,
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            isActive: true,
                        },
                    },
                },
            });

            if (!admin) {
                throw new ApiError(401, 'User not found');
            }

            // Verify organization existence and status
            if (admin.role !== 'SUPER_ADMIN') {
                if (!admin.organization) {
                    throw new ApiError(401, 'Organization not found or has been removed');
                }
                if (!admin.organization.isActive) {
                    throw new ApiError(403, 'Your organization account has been deactivated');
                }
            }

            req.user = {
                id: admin.id,
                type: decoded.userType,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                organizationId: admin.organizationId,
                organization: admin.organization,
            };
        } else {
            req.user = {
                id: decoded.userId,
                type: decoded.userType,
                email: decoded.email,
            };
        }

        next();
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else if (error.name === 'TokenExpiredError') {
            next(new ApiError(401, 'Token expired'));
        } else if (error.name === 'JsonWebTokenError') {
            next(new ApiError(401, 'Invalid token'));
        } else {
            next(error);
        }
    }
}

/**
 * Require admin role
 */
export function requireAdmin(req, res, next) {
    if (req.user?.type !== 'ADMIN' && req.user?.type !== 'SUPER_ADMIN') {
        return next(new ApiError(403, 'Admin access required'));
    }
    next();
}

/**
 * Require specific role(s)
 * @param {...string} roles - Allowed roles (e.g., 'SUPER_ADMIN', 'ORG_ADMIN')
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ApiError(403, `Required role: ${roles.join(' or ')}`));
        }
        next();
    };
}

// Alias for cleaner imports
export const authMiddleware = authenticate;

/**
 * Require driver role
 */
export function requireDriver(req, res, next) {
    if (req.user?.type !== 'DRIVER') {
        return next(new ApiError(403, 'Driver access required'));
    }
    next();
}

/**
 * Authenticate Bus API Key for GPS updates
 * API key should be in Authorization header: Bearer <API_KEY>
 */
export async function authenticateBusApiKey(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const bodyGpsDeviceId = req.body?.gpsDeviceId;

        if (!authHeader && !bodyGpsDeviceId) {
            throw new ApiError(401, 'Authentication required (API Key or Device ID)');
        }

        const apiKey = authHeader ? authHeader.split(' ')[1] : null;

        if (!apiKey && !bodyGpsDeviceId) {
            throw new ApiError(401, 'API key or GPS Device ID required');
        }

        // Find bus by API key or GPS Device ID
        const bus = await prisma.bus.findFirst({
            where: {
                OR: [
                    apiKey ? { apiKey: apiKey } : null,
                    bodyGpsDeviceId ? { gpsDeviceId: bodyGpsDeviceId } : null
                ].filter(Boolean),
                isActive: true
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        if (!bus) {
            throw new ApiError(401, apiKey ? 'Invalid API key' : 'Invalid GPS Device ID');
        }

        req.bus = bus;
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            return next();
        }

        const decoded = jwt.verify(token, jwtConfig.accessToken.secret);

        req.user = {
            id: decoded.userId,
            type: decoded.userType,
            email: decoded.email,
        };

        next();
    } catch (error) {
        // Token invalid but optional, continue
        next();
    }
}

export default {
    authenticate,
    requireAdmin,
    requireDriver,
    authenticateBusApiKey,
    optionalAuth
};
