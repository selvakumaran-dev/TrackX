/**
 * ============================================
 * Socket.IO Server Configuration - Optimized for Scale
 * ============================================
 * Real-time communication for bus tracking
 * Optimized for 1000+ concurrent connections
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { getBusLocation, getAllBusLocations } from '../config/redis.js';
import { isOnline } from '../utils/helpers.js';

// Match service threshold
const OFFLINE_THRESHOLD = parseInt(process.env.GPS_OFFLINE_THRESHOLD_SECONDS) || 30;

let io = null;

// Track connection statistics
const stats = {
    totalConnections: 0,
    activeConnections: 0,
    peakConnections: 0,
    roomStats: new Map(),
};

/**
 * Initialize Socket.IO server - Optimized for high concurrency
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server
 */
export function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Performance optimizations for 1000+ users
        pingTimeout: 60000,
        pingInterval: 25000,
        perMessageDeflate: {
            threshold: 1024, // Only compress messages > 1KB
            zlibDeflateOptions: { chunkSize: 16 * 1024 },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
        },
        // Allow binary data for efficiency
        allowEIO3: true,
        // Limit connection memory
        maxHttpBufferSize: 1e6, // 1MB max message size
        // Transport options
        transports: ['websocket', 'polling'],
        // Upgrade timeout
        upgradeTimeout: 10000,
    });

    // ==========================================
    // Connection Handler - Optimized
    // ==========================================
    io.on('connection', (socket) => {
        stats.totalConnections++;
        stats.activeConnections++;
        if (stats.activeConnections > stats.peakConnections) {
            stats.peakConnections = stats.activeConnections;
        }

        // Log only in development or at significant milestones
        if (process.env.NODE_ENV === 'development' || stats.totalConnections % 100 === 0) {
            console.log(`🔌 Client connected: ${socket.id} (Active: ${stats.activeConnections})`);
        }

        // ========================================
        // Join Bus Tracking Room - Optimized
        // ========================================
        socket.on('join-bus', async (busId) => {
            if (!busId || typeof busId !== 'string') {
                socket.emit('error', { message: 'Valid bus ID required' });
                return;
            }

            const roomName = `bus-${busId}`;

            // Leave any previous bus rooms first
            for (const room of socket.rooms) {
                if (room.startsWith('bus-') && room !== roomName) {
                    socket.leave(room);
                }
            }

            socket.join(roomName);
            socket.data.busId = busId;

            // Track room stats
            const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
            stats.roomStats.set(roomName, roomSize);
            console.log(`👁️ Client ${socket.id} joined ${roomName} (${roomSize} in room)`);

            // Send initial location data
            try {
                const location = await getBusLocation(busId);
                if (location) {
                    location.isOnline = isOnline(location.updatedAt, OFFLINE_THRESHOLD);
                }
                socket.emit('location-update', location || {
                    busId: busId,
                    lat: null,
                    lon: null,
                    isOnline: false,
                });
            } catch (error) {
                console.error('Error fetching bus location:', error);
            }
        });

        // ========================================
        // Leave Bus Tracking Room
        // ========================================
        socket.on('leave-bus', (busId) => {
            if (!busId) return;
            const roomName = `bus-${busId}`;
            socket.leave(roomName);
            socket.data.busId = null;
        });

        // ========================================
        // Join Admin Dashboard Room - Scoped by Organization
        // ========================================
        socket.on('join-admin-dashboard', async (token) => {
            try {
                if (!token) {
                    socket.emit('error', { message: 'Authentication token required' });
                    return;
                }

                const decoded = jwt.verify(token, jwtConfig.accessToken.secret);
                if (decoded.userType !== 'ADMIN') {
                    socket.emit('error', { message: 'Admin access required' });
                    return;
                }

                const organizationId = decoded.organizationId;
                if (!organizationId) {
                    socket.emit('error', { message: 'Organization ID not found in token' });
                    return;
                }

                const roomName = `admin-dashboard-${organizationId}`;
                socket.join(roomName);
                socket.data.organizationId = organizationId;

                console.log(`👨‍💼 Admin joined room: ${roomName}`);

                // Send initial data for all buses in this organization
                const allLocations = await getAllBusLocations();
                const filteredLocations = allLocations.filter(loc => loc.organizationId === organizationId);

                socket.emit('all-bus-locations', filteredLocations);
            } catch (error) {
                console.error('Admin join error:', error);
                socket.emit('error', { message: 'Authentication failed' });
            }
        });

        // ========================================
        // Driver Tracking Session
        // ========================================
        socket.on('start-driver-tracking', (data) => {
            const { driverId, busNumber } = data;
            if (!driverId || !busNumber) {
                socket.emit('error', { message: 'Driver ID and bus number required' });
                return;
            }

            socket.data.isTracking = true;
            socket.data.driverId = driverId;
            socket.data.busNumber = busNumber;

            socket.emit('tracking-status', {
                status: 'TRACKING_ON',
                message: 'Location tracking started'
            });
        });

        socket.on('stop-driver-tracking', () => {
            socket.data.isTracking = false;
            socket.emit('tracking-status', {
                status: 'TRACKING_OFF',
                message: 'Location tracking stopped'
            });
        });

        // ========================================
        // Ping/Pong for Connection Check
        // ========================================
        socket.on('ping-server', () => {
            socket.emit('pong-server', { timestamp: Date.now() });
        });

        // ========================================
        // Disconnect Handler
        // ========================================
        socket.on('disconnect', (reason) => {
            stats.activeConnections--;

            // Log disconnects sparingly
            if (process.env.NODE_ENV === 'development') {
                console.log(`❌ Disconnected: ${socket.id} (Active: ${stats.activeConnections})`);
            }
        });

        // ========================================
        // Error Handler
        // ========================================
        socket.on('error', (error) => {
            console.error(`Socket error: ${socket.id}`, error);
        });
    });

    // Log stats periodically (every 5 minutes)
    setInterval(() => {
        if (stats.activeConnections > 0) {
            console.log(`📊 Socket Stats - Active: ${stats.activeConnections}, Peak: ${stats.peakConnections}, Total: ${stats.totalConnections}`);
        }
    }, 5 * 60 * 1000);

    return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
    return io;
}

/**
 * Broadcast location update to bus room - Optimized
 * Uses regular emit for guaranteed delivery (not volatile)
 */
export function broadcastBusLocation(busId, locationData, organizationId = null) {
    if (!io) return;

    // Room name using ID for uniqueness
    const busRoom = `bus-${busId}`;
    io.to(busRoom).emit('location-update', locationData);

    // Broadcast to organization-specific admin dashboard
    if (organizationId) {
        io.to(`admin-dashboard-${organizationId}`).emit('bus-update', locationData);
    } else if (locationData.organizationId) {
        io.to(`admin-dashboard-${locationData.organizationId}`).emit('bus-update', locationData);
    }
}

/**
 * Broadcast to all connected clients
 */
export function broadcastToAll(event, data) {
    if (!io) return;
    io.emit(event, data);
}

/**
 * Get current socket statistics
 */
export function getSocketStats() {
    return {
        ...stats,
        roomStats: Object.fromEntries(stats.roomStats),
    };
}

export default {
    initializeSocket,
    getIO,
    broadcastBusLocation,
    broadcastToAll,
    getSocketStats,
};
