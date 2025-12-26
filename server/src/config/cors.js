/**
 * ============================================
 * CORS Configuration
 * ============================================
 * Cross-Origin Resource Sharing settings
 * Uses centralized environment configuration
 */

import { config } from './env.js';

export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (config.cors.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (config.isDev) {
            // In development, allow all origins
            callback(null, true);
        } else {
            console.warn(`❌ CORS Rejected: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 hours
};

export default corsOptions;
