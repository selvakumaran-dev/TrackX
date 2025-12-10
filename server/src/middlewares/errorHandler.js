/**
 * ============================================
 * Global Error Handler Middleware
 * ============================================
 * Centralized error handling for all routes
 */

import { ZodError } from 'zod';

/**
 * Custom API Error class for consistent error responses
 */
export class ApiError extends Error {
    constructor(statusCode, message, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }

    // Handle custom API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            ...(err.errors && { details: err.errors }),
        });
    }

    // Handle Prisma errors
    if (err.code?.startsWith('P')) {
        const prismaErrorMap = {
            P2002: { status: 409, message: 'A record with this value already exists' },
            P2025: { status: 404, message: 'Record not found' },
            P2003: { status: 400, message: 'Foreign key constraint failed' },
        };

        const errorInfo = prismaErrorMap[err.code] || {
            status: 500,
            message: 'Database error occurred'
        };

        return res.status(errorInfo.status).json({
            success: false,
            error: errorInfo.message,
        });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
        });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

export default errorHandler;
