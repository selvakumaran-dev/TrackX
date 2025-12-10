/**
 * ============================================
 * Data Cleanup Service
 * ============================================
 * Scheduled cleanup of old GPS logs and expired tokens
 * Prevents database bloat and maintains performance
 */

import { prisma } from '../config/database.js';

// Configuration
const GPS_LOG_RETENTION_DAYS = parseInt(process.env.GPS_LOG_RETENTION_DAYS) || 30;
const TOKEN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const GPS_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Delete GPS logs older than retention period
 * Keeps the most recent log per bus for current location fallback
 */
export async function cleanupOldGpsLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - GPS_LOG_RETENTION_DAYS);

    try {
        // Get all buses
        const buses = await prisma.bus.findMany({
            select: { id: true, busNumber: true },
        });

        let totalDeleted = 0;

        for (const bus of buses) {
            // Get the ID of the most recent log for this bus (to preserve it)
            const recentLog = await prisma.gpsLog.findFirst({
                where: { busId: bus.id },
                orderBy: { timestamp: 'desc' },
                select: { id: true },
            });

            // Delete old logs, excluding the most recent one
            const result = await prisma.gpsLog.deleteMany({
                where: {
                    busId: bus.id,
                    timestamp: { lt: cutoffDate },
                    ...(recentLog && { id: { not: recentLog.id } }),
                },
            });

            totalDeleted += result.count;
        }

        if (totalDeleted > 0) {
            console.log(`🧹 Cleaned up ${totalDeleted} old GPS logs (older than ${GPS_LOG_RETENTION_DAYS} days)`);
        }

        return { deleted: totalDeleted };
    } catch (error) {
        console.error('❌ GPS log cleanup failed:', error);
        return { deleted: 0, error: error.message };
    }
}

/**
 * Delete expired and revoked refresh tokens
 */
export async function cleanupExpiredTokens() {
    try {
        const result = await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isRevoked: true },
                ],
            },
        });

        if (result.count > 0) {
            console.log(`🧹 Cleaned up ${result.count} expired/revoked tokens`);
        }

        return { deleted: result.count };
    } catch (error) {
        console.error('❌ Token cleanup failed:', error);
        return { deleted: 0, error: error.message };
    }
}

/**
 * Start cleanup scheduler
 * Called once at server startup
 */
export function startCleanupScheduler() {
    console.log('🧹 Starting data cleanup scheduler...');
    console.log(`   - GPS logs: Retain ${GPS_LOG_RETENTION_DAYS} days, cleanup every 24h`);
    console.log(`   - Expired tokens: cleanup every 1h`);

    // Initial cleanup on startup (delayed to not block server start)
    setTimeout(() => {
        cleanupExpiredTokens();
        cleanupOldGpsLogs();
    }, 10000); // 10 seconds after startup

    // Schedule periodic cleanup
    setInterval(cleanupExpiredTokens, TOKEN_CLEANUP_INTERVAL_MS);
    setInterval(cleanupOldGpsLogs, GPS_CLEANUP_INTERVAL_MS);
}

export default {
    cleanupOldGpsLogs,
    cleanupExpiredTokens,
    startCleanupScheduler,
};
