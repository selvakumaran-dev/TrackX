/**
 * ============================================
 * Zod Validation Schemas
 * ============================================
 * Request validation schemas for all endpoints
 */

import { z } from 'zod';

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    userType: z.enum(['ADMIN', 'DRIVER', 'SUPER_ADMIN']).optional().default('ADMIN'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token required'),
});

// ============================================
// Admin Schemas
// ============================================

export const createAdminSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional().default('ADMIN'),
});

// ============================================
// Bus Schemas
// ============================================

// MongoDB ObjectId is 24 hex characters
const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format').optional().nullable();

export const createBusSchema = z.object({
    busNumber: z.string()
        .min(1, 'Bus number is required')
        .max(20, 'Bus number must be 20 characters or less'),
    busName: z.string()
        .min(2, 'Bus name must be at least 2 characters')
        .max(100, 'Bus name must be 100 characters or less'),
    gpsDeviceId: z.string().max(100).optional().nullable(),
    driverId: mongoIdSchema,
    isActive: z.boolean().optional().default(true),
});

export const updateBusSchema = createBusSchema.partial();

// ============================================
// Driver Schemas
// ============================================

export const createDriverSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string()
        .regex(/^[+]?[\d\s\-()]{10,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
    busId: mongoIdSchema,
    isActive: z.boolean().optional().default(true),
});

export const updateDriverSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string()
        .regex(/^[+]?[\d\s\-()]{10,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
    busId: mongoIdSchema,
    isActive: z.boolean().optional(),
});

export const updateDriverProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string()
        .regex(/^[+]?[\d\s\-()]{10,20}$/, 'Invalid phone number format')
        .optional()
        .nullable(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine(data => {
    // If changing password, current password is required
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: 'Current password is required to change password',
    path: ['currentPassword'],
});

// ============================================
// GPS Update Schemas
// ============================================

export const gpsUpdateSchema = z.object({
    busId: z.string().optional(), // Can be provided or inferred from API key
    lat: z.number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    lon: z.number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    speed: z.number().min(0).max(300).optional().default(0), // km/h
    heading: z.number().min(0).max(360).optional(),
    accuracy: z.number().min(0).optional(),
    altitude: z.number().optional(),
    timestamp: z.string().datetime().optional(),
});

export const driverLocationUpdateSchema = z.object({
    lat: z.number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    lon: z.number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    speed: z.number().min(0).max(300).optional().default(0),
    accuracy: z.number().min(0).optional().nullable(),
    heading: z.number().min(0).max(360).optional().nullable(),
});

// ============================================
// Query Schemas
// ============================================

export const paginationSchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const busSearchSchema = z.object({
    busNumber: z.string().min(1, 'Bus number is required'),
});

// ============================================
// Validation Helper
// ============================================

/**
 * Validate request body against schema
 * @param {z.Schema} schema - Zod schema
 */
export function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Validate query parameters against schema
 * @param {z.Schema} schema - Zod schema
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            next(error);
        }
    };
}

export default {
    loginSchema,
    refreshTokenSchema,
    createAdminSchema,
    createBusSchema,
    updateBusSchema,
    createDriverSchema,
    updateDriverSchema,
    updateDriverProfileSchema,
    gpsUpdateSchema,
    driverLocationUpdateSchema,
    paginationSchema,
    busSearchSchema,
    validate,
    validateQuery,
};
