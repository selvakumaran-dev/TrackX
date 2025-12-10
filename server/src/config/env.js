/**
 * ============================================
 * TrackX Server - Environment Configuration
 * ============================================
 * Centralized configuration management with
 * validation and environment-specific defaults
 */

import { z } from 'zod';

// ============================================
// Environment Schema Validation
// ============================================
const envSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform(Number),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // Redis (optional - falls back to in-memory)
    REDIS_URL: z.string().optional(),
    SKIP_REDIS: z.string().optional().transform(v => v === 'true'),

    // JWT Authentication
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().default('7d'),

    // CORS
    CORS_ORIGIN: z.string().optional(),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

    // GPS Settings
    GPS_OFFLINE_THRESHOLD_SECONDS: z.string().default('120').transform(Number),

    // File Upload
    MAX_FILE_SIZE_MB: z.string().default('5').transform(Number),
    UPLOAD_DIR: z.string().default('./uploads'),
});

// ============================================
// Parse and Validate Environment
// ============================================
function validateEnv() {
    // In development, provide sensible defaults for secrets
    const isDev = process.env.NODE_ENV !== 'production';

    const envWithDefaults = {
        ...process.env,
        // Only use dev defaults in non-production
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ||
            (isDev ? 'trackx-dev-access-secret-key-32chars!!' : undefined),
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ||
            (isDev ? 'trackx-dev-refresh-secret-key-32chars!!' : undefined),
    };

    const result = envSchema.safeParse(envWithDefaults);

    if (!result.success) {
        console.error('❌ Environment validation failed:');
        console.error(result.error.format());

        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            console.warn('⚠️  Running with invalid config in development mode');
        }
    }

    return result.data;
}

const env = validateEnv();

// ============================================
// Exported Configuration Object
// ============================================
export const config = {
    // Environment
    env: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',

    // Server
    server: {
        port: env.PORT,
        host: '0.0.0.0',
    },

    // Database
    database: {
        url: env.DATABASE_URL,
    },

    // Redis
    redis: {
        url: env.REDIS_URL,
        skip: env.SKIP_REDIS || false,
    },

    // JWT
    jwt: {
        accessToken: {
            secret: env.JWT_ACCESS_SECRET,
            expiresIn: env.JWT_ACCESS_EXPIRY,
        },
        refreshToken: {
            secret: env.JWT_REFRESH_SECRET,
            expiresIn: env.JWT_REFRESH_EXPIRY,
        },
    },

    // CORS
    cors: {
        origin: env.CORS_ORIGIN,
        allowedOrigins: [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            env.CORS_ORIGIN,
        ].filter(Boolean),
    },

    // Rate Limiting
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    // GPS
    gps: {
        offlineThresholdSeconds: env.GPS_OFFLINE_THRESHOLD_SECONDS,
    },

    // File Upload
    upload: {
        maxFileSizeMB: env.MAX_FILE_SIZE_MB,
        maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
        directory: env.UPLOAD_DIR,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
};

// ============================================
// Helper to check required secrets in production
// ============================================
export function validateProductionSecrets() {
    if (config.isProd) {
        const required = [
            'DATABASE_URL',
            'JWT_ACCESS_SECRET',
            'JWT_REFRESH_SECRET',
        ];

        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            console.error('❌ Missing required production secrets:', missing.join(', '));
            process.exit(1);
        }

        // Warn if using default secrets
        if (process.env.JWT_ACCESS_SECRET?.includes('dev')) {
            console.error('❌ Using development JWT secrets in production!');
            process.exit(1);
        }
    }
}

export default config;
