/**
 * ============================================
 * TrackX Server - Main Entry Point
 * ============================================
 * Enterprise-grade real-time bus tracking system
 * with Socket.IO, Redis caching, and PostgreSQL
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Import configurations
import { corsOptions } from './config/cors.js';
import { initializeSocket } from './socket/index.js';
import { connectRedis } from './config/redis.js';
import { prisma } from './config/database.js';

// Import middlewares
import { errorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { rateLimiter } from './middlewares/rateLimiter.js';
import { startCleanupScheduler } from './services/cleanup.service.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import driverRoutes from './routes/driver.routes.js';
import gpsRoutes from './routes/gps.routes.js';
import publicRoutes from './routes/public.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import superAdminRoutes from './routes/superadmin.routes.js';

// ============================================
// Initialize Express Application
// ============================================
const app = express();
const httpServer = createServer(app);

// ============================================
// Security Middlewares
// ============================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));

// ============================================
// Compression for faster responses (1000+ users)
// ============================================
app.use(compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
}));

// ============================================
// Body Parsing Middlewares
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Static Files (for driver photos, etc.)
// ============================================
app.use('/uploads', express.static('uploads'));

// ============================================
// Request Logging (Development)
// ============================================
if (process.env.NODE_ENV === 'development') {
    app.use(requestLogger);
}

// ============================================
// Rate Limiting on GPS endpoints
// ============================================
app.use('/api/gps', rateLimiter);

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/superadmin', superAdminRoutes);

// ============================================
// Health Check Endpoint (for load balancers)
// ============================================
app.get('/health', (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV,
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        },
    });
});

// ============================================
// Root Endpoint
// ============================================
app.get('/', (req, res) => {
    res.json({
        name: 'TrackX API',
        version: '1.0.0',
        description: 'Enterprise Real-Time Bus Tracking System',
        documentation: '/api/docs'
    });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// ============================================
// Global Error Handler
// ============================================
app.use(errorHandler);

// ============================================
// Initialize Services & Start Server
// ============================================
const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Connect to MongoDB via Prisma
        await prisma.$connect();
        console.log('✅ MongoDB connected via Prisma');

        // Connect to Redis
        await connectRedis();
        console.log('✅ Redis connected');

        // Initialize Socket.IO
        const io = initializeSocket(httpServer);
        app.set('io', io);
        console.log('✅ Socket.IO initialized');

        // Start HTTP server
        httpServer.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 TrackX Server Running                     ║
║                                                ║
║   Port: ${PORT}                                   ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   API: http://localhost:${PORT}                   ║
║                                                ║
╚════════════════════════════════════════════════╝
      `);

            // Start data cleanup scheduler
            startCleanupScheduler();
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM received, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️  SIGINT received, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Start the server
startServer();

export { app };
