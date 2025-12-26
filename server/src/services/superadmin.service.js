/**
 * ============================================
 * SuperAdmin Service
 * ============================================
 * Business logic for global system monitoring
 */

import { prisma } from '../config/database.js';
import { getAllBusLocations } from '../config/redis.js';
import { isOnline } from '../utils/helpers.js';
import { ApiError } from '../middlewares/errorHandler.js';

import os from 'os';

// Offline threshold in seconds
const OFFLINE_THRESHOLD = parseInt(process.env.GPS_OFFLINE_THRESHOLD_SECONDS) || 30;

/**
 * Get global system statistics
 */
export async function getGlobalSystemStats() {
    // 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
        totalOrganizations,
        totalAdmins,
        totalDrivers,
        totalBuses,
        activeLocations,
        newOrgs,
        newAdmins,
        newBuses
    ] = await Promise.all([
        prisma.organization.count(),
        prisma.admin.count(),
        prisma.driver.count(),
        prisma.bus.count({ where: { isActive: true } }),
        getAllBusLocations(),
        prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.admin.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.bus.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const onlineBuses = activeLocations.filter(loc =>
        isOnline(loc.updatedAt, OFFLINE_THRESHOLD)
    ).length;

    // Calculate growth percentages
    const calculateGrowth = (current, last) => {
        if (current === 0) return 0;
        return Math.round((last / current) * 100);
    };

    return {
        totalOrganizations,
        totalAdmins,
        totalDrivers,
        totalBuses,
        onlineBuses,
        offlineBuses: Math.max(0, totalBuses - onlineBuses),
        systemHealth: totalBuses > 0 ? Math.round((onlineBuses / totalBuses) * 100) : 100,
        trends: {
            organizations: calculateGrowth(totalOrganizations, newOrgs),
            admins: calculateGrowth(totalAdmins, newAdmins),
            buses: calculateGrowth(totalBuses, newBuses)
        },
        lastUpdated: new Date().toISOString(),
    };
}


/**
 * Get all organizations with basic stats
 */
export async function getAllOrganizations() {
    const organizations = await prisma.organization.findMany({
        include: {
            _count: {
                select: {
                    admins: true,
                    drivers: true,
                    buses: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return organizations;
}

/**
 * Get registration trends for the last 30 days
 */
export async function getRegistrationTrends() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const organizations = await prisma.organization.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true }
    });

    const drivers = await prisma.driver.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true }
    });

    // Group by date
    const trends = {};
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        trends[formatDate(d)] = { organizations: 0, drivers: 0 };
    }

    organizations.forEach(o => {
        const date = formatDate(o.createdAt);
        if (trends[date]) trends[date].organizations++;
    });

    drivers.forEach(d => {
        const date = formatDate(d.createdAt);
        if (trends[date]) trends[date].drivers++;
    });

    return Object.entries(trends)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get global live map data
 */
export async function getGlobalLiveMap() {
    const activeLocations = await getAllBusLocations();

    // Group by organization
    const organizations = await prisma.organization.findMany({
        select: { id: true, name: true, primaryColor: true }
    });

    const orgMap = new Map(organizations.map(o => [o.id, o]));

    return activeLocations.map(loc => ({
        ...loc,
        isOnline: isOnline(loc.updatedAt, OFFLINE_THRESHOLD),
        organizationName: orgMap.get(loc.organizationId)?.name || 'Unknown',
        color: orgMap.get(loc.organizationId)?.primaryColor || '#6366f1'
    }));
}

/**
 * Get system health metrics
 */
export async function getSystemHealth() {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    const cpus = os.cpus();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();

    const activeLocations = await getAllBusLocations();
    const onlineBuses = activeLocations.filter(loc => isOnline(loc.updatedAt, OFFLINE_THRESHOLD)).length;
    const totalBuses = await prisma.bus.count({ where: { isActive: true } });

    return {
        cpuSpeed: `${(cpus[0].speed / 1000).toFixed(1)} GHz`,
        memoryUsed: `${Math.round((totalMem - freeMem) / 1024 / 1024 / 1024 * 10) / 10} GB`,
        memoryTotal: `${Math.round(totalMem / 1024 / 1024 / 1024 * 10) / 10} GB`,
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        uptimeIndex: totalBuses > 0 ? Math.round((onlineBuses / totalBuses) * 1000) / 10 : 100,
        latency: '12ms',
        storage: `${Math.round((1 - freeMem / totalMem) * 100)}%`,
        status: 'Optimal',
        platform: os.platform(),
        arch: os.arch()
    };
}

/**
 * Create a new organization
 */
export async function createOrganization(data) {
    // Generate slug from name
    const slug = data.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const organization = await prisma.organization.create({
        data: {
            name: data.name,
            code: data.code,
            slug: data.slug || slug,
            primaryColor: data.primaryColor || '#2D6A4F',
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            isVerified: true,
            isActive: true
        }
    });

    return organization;
}

/**
 * Update an organization
 */
export async function updateOrganization(id, data) {
    const organization = await prisma.organization.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            primaryColor: data.primaryColor,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            isActive: data.isActive,
            isVerified: data.isVerified
        }
    });

    return organization;
}

/**
 * Delete an organization
 */
export async function deleteOrganization(id) {
    // Check for active data first
    const [buses, drivers] = await Promise.all([
        prisma.bus.count({ where: { organizationId: id } }),
        prisma.driver.count({ where: { organizationId: id } })
    ]);

    if (buses > 0 || drivers > 0) {
        throw new ApiError(400, `Cannot delete institution. It has ${buses} active buses and ${drivers} drivers associated with it.`);
    }

    // Manual Cleanup for remaining secondary data (like admins)
    await prisma.$transaction([
        prisma.admin.deleteMany({ where: { organizationId: id, role: { not: 'SUPER_ADMIN' } } }),
        prisma.organization.delete({ where: { id } })
    ]);

    return { success: true };
}

/**
 * Get platform configuration
 */
export async function getSystemConfig() {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
        config = await prisma.systemConfig.create({
            data: {
                matrixAutoScaling: true,
                rootCipherLogic: 'AES-512-GCM',
                telemetryPushFreq: 1000,
                maintenanceMode: false
            }
        });
    }
    return config;
}

/**
 * Update platform configuration
 */
export async function updateSystemConfig(data) {
    const config = await prisma.systemConfig.findFirst();
    if (!config) {
        return await prisma.systemConfig.create({ data });
    }
    return await prisma.systemConfig.update({
        where: { id: config.id },
        data: {
            matrixAutoScaling: data.matrixAutoScaling,
            rootCipherLogic: data.rootCipherLogic,
            telemetryPushFreq: parseInt(data.telemetryPushFreq),
            maintenanceMode: data.maintenanceMode
        }
    });
}

/**
 * Get recent system activity
 */
export async function getRecentActivity() {
    const [organizations, drivers, buses] = await Promise.all([
        prisma.organization.findMany({ take: 3, orderBy: { createdAt: 'desc' } }),
        prisma.driver.findMany({ take: 3, orderBy: { createdAt: 'desc' } }),
        prisma.bus.findMany({ take: 3, orderBy: { createdAt: 'desc' } })
    ]);

    const activities = [
        ...organizations.map(o => ({
            type: 'ORGANIZATION',
            event: `New Org: ${o.name}`,
            time: o.createdAt,
            icon: 'Building2'
        })),
        ...drivers.map(d => ({
            type: 'DRIVER',
            event: `Driver: ${d.name}`,
            time: d.createdAt,
            icon: 'User'
        })),
        ...buses.map(b => ({
            type: 'BUS',
            event: `Bus: ${b.busNumber}`,
            time: b.createdAt,
            icon: 'Bus'
        }))
    ];

    return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);
}
