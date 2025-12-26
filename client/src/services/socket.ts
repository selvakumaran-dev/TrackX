/**
 * Socket Service - TypeScript
 * Socket.IO client for real-time updates
 */

import { io, Socket } from 'socket.io-client';
import type { BusLocation } from '../types';
import { socketUrl } from '../config/env';

// In development, use same origin (Vite proxy handles it)
// In production, use the configured URL
const SOCKET_URL = socketUrl || window.location.origin;

type LocationCallback = (data: BusLocation) => void;
type StatusCallback = (status: { tracking: boolean; message?: string }) => void;

class SocketService {
    private socket: Socket | null = null;
    public isConnected: boolean = false;
    private subscribedBuses: Set<string> = new Set();

    /**
     * Connect to Socket.IO server
     */
    connect(): Socket {
        if (this.socket) {
            return this.socket;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000,
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected:', this.socket?.id);
            this.isConnected = true;
            // Resubscribe to buses
            this.subscribedBuses.forEach(bus => {
                this.socket?.emit('join-bus', bus);
            });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return this.socket;
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.subscribedBuses.clear();
        }
    }

    /**
     * Subscribe to a bus for location updates
     */
    subscribeToBus(busId: string): void {
        if (!this.socket) this.connect();
        this.subscribedBuses.add(busId);
        this.socket?.emit('join-bus', busId);
    }

    /**
     * Unsubscribe from a bus
     */
    unsubscribeFromBus(busId: string): void {
        this.subscribedBuses.delete(busId);
        this.socket?.emit('leave-bus', busId);
    }

    /**
     * Join admin dashboard room
     */
    joinAdminDashboard(token: string): void {
        if (!this.socket) this.connect();
        this.socket?.emit('join-admin-dashboard', token);
    }

    /**
     * Subscribe to location updates
     */
    onLocationUpdate(callback: LocationCallback): () => void {
        if (!this.socket) this.connect();
        const wrappedCallback = (data: BusLocation) => {
            console.log('📍 Socket received location-update:', data.busNumber, data.lat, data.lon, data.isOnline);
            callback(data);
        };
        this.socket?.on('location-update', wrappedCallback);
        return () => {
            this.socket?.off('location-update', wrappedCallback);
        };
    }

    /**
     * Subscribe to bus updates (for admin dashboard)
     */
    onBusUpdate(callback: LocationCallback): () => void {
        if (!this.socket) this.connect();
        this.socket?.on('bus-update', callback);
        return () => {
            this.socket?.off('bus-update', callback);
        };
    }

    /**
     * Subscribe to all bus locations (initial data)
     */
    onAllBusLocations(callback: (locations: BusLocation[]) => void): () => void {
        if (!this.socket) this.connect();
        this.socket?.on('all-bus-locations', callback);
        return () => {
            this.socket?.off('all-bus-locations', callback);
        };
    }

    /**
     * Start driver tracking session
     */
    startDriverTracking(driverId: string, busNumber: string): void {
        if (!this.socket) this.connect();
        this.socket?.emit('start-driver-tracking', { driverId, busNumber });
    }

    /**
     * Stop driver tracking session
     */
    stopDriverTracking(): void {
        this.socket?.emit('stop-driver-tracking');
    }

    /**
     * Subscribe to tracking status
     */
    onTrackingStatus(callback: StatusCallback): () => void {
        if (!this.socket) this.connect();
        this.socket?.on('tracking-status', callback);
        return () => {
            this.socket?.off('tracking-status', callback);
        };
    }

    /**
     * Ping server to check connection
     */
    ping(): Promise<number> {
        return new Promise((resolve) => {
            const start = Date.now();
            this.socket?.emit('ping-server');
            this.socket?.once('pong-server', () => {
                resolve(Date.now() - start);
            });
        });
    }

    /**
     * Get connection status
     */
    getStatus(): { connected: boolean; id: string | null } {
        return {
            connected: this.socket?.connected ?? false,
            id: this.socket?.id ?? null,
        };
    }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
