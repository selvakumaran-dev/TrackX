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
 * Adds user info to req.user
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

        req.user = {
            id: decoded.userId,
            type: decoded.userType, // 'ADMIN' or 'DRIVER'
            email: decoded.email,
        };

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
    if (req.user?.type !== 'ADMIN') {
        return next(new ApiError(403, 'Admin access required'));
    }
    next();
}

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

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'API key required');
        }

        const apiKey = authHeader.split(' ')[1];

        // Find bus by API key
        const bus = await prisma.bus.findFirst({
            where: {
                apiKey: apiKey,
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
            throw new ApiError(401, 'Invalid API key');
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
