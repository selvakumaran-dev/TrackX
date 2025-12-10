/**
 * ============================================
 * Authentication Service
 * ============================================
 * Handles user authentication, JWT tokens,
 * and password management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { jwtConfig, parseExpiryToSeconds } from '../config/jwt.js';
import { blacklistToken } from '../config/redis.js';
import { ApiError } from '../middlewares/errorHandler.js';

const SALT_ROUNDS = 12;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate access token
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
export function generateAccessToken(payload) {
    return jwt.sign(payload, jwtConfig.accessToken.secret, {
        expiresIn: jwtConfig.accessToken.expiresIn,
    });
}

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @returns {string} JWT token
 */
export function generateRefreshToken(payload) {
    return jwt.sign(payload, jwtConfig.refreshToken.secret, {
        expiresIn: jwtConfig.refreshToken.expiresIn,
    });
}

/**
 * Generate token pair (access + refresh)
 * @param {string} userId - User ID
 * @param {string} userType - 'ADMIN' or 'DRIVER'
 * @param {string} email - User email
 */
export function generateTokenPair(userId, userType, email) {
    const payload = { userId, userType, email };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
        expiresIn: parseExpiryToSeconds(jwtConfig.accessToken.expiresIn),
    };
}

/**
 * Login user (Admin or Driver)
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} userType - 'ADMIN' or 'DRIVER'
 */
export async function login(email, password, userType = 'ADMIN') {
    let user;

    if (userType === 'ADMIN') {
        user = await prisma.admin.findUnique({
            where: { email },
        });
    } else if (userType === 'DRIVER') {
        user = await prisma.driver.findUnique({
            where: { email },
            include: {
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
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated');
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Update last login
    if (userType === 'ADMIN') {
        await prisma.admin.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
    } else {
        await prisma.driver.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, userType, user.email);

    // Store refresh token
    await storeRefreshToken(tokens.refreshToken, user.id, userType);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
        user: userWithoutPassword,
        ...tokens,
    };
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(token, userId, userType) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
        data: {
            token,
            userId,
            userType,
            expiresAt,
        },
    });
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 */
export async function refreshAccessToken(refreshToken) {
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, jwtConfig.refreshToken.secret);

        // Check if token exists and is not revoked
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });

        if (!storedToken || storedToken.isRevoked) {
            throw new ApiError(401, 'Invalid refresh token');
        }

        if (new Date() > storedToken.expiresAt) {
            throw new ApiError(401, 'Refresh token expired');
        }

        // Generate new access token
        const accessToken = generateAccessToken({
            userId: decoded.userId,
            userType: decoded.userType,
            email: decoded.email,
        });

        return {
            accessToken,
            expiresIn: parseExpiryToSeconds(jwtConfig.accessToken.expiresIn),
        };
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(401, 'Invalid refresh token');
    }
}

/**
 * Logout user - revoke tokens
 * @param {string} accessToken - Current access token
 * @param {string} refreshToken - Refresh token to revoke
 */
export async function logout(accessToken, refreshToken) {
    try {
        // Blacklist access token in Redis
        const decoded = jwt.decode(accessToken);
        if (decoded?.exp) {
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
            if (expiresIn > 0) {
                await blacklistToken(accessToken, expiresIn);
            }
        }

        // Revoke refresh token in database
        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true },
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: true }; // Still return success
    }
}

/**
 * Cleanup expired refresh tokens
 */
export async function cleanupExpiredTokens() {
    await prisma.refreshToken.deleteMany({
        where: {
            OR: [
                { expiresAt: { lt: new Date() } },
                { isRevoked: true },
            ],
        },
    });
}

export default {
    hashPassword,
    comparePassword,
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    login,
    refreshAccessToken,
    logout,
    cleanupExpiredTokens,
};
