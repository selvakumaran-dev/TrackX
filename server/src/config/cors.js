/**
 * ============================================
 * CORS Configuration
 * ============================================
 * Cross-Origin Resource Sharing settings
 * for production and development environments
 */

const allowedOrigins = [
    'http://localhost:5173',      // Vite dev server
    'http://localhost:3000',      // Alternative dev port
    'http://127.0.0.1:5173',
    process.env.CORS_ORIGIN,      // Production origin
].filter(Boolean);

export const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'development') {
            // In development, allow all origins
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
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
