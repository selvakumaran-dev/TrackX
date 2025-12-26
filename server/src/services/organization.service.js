/**
 * ============================================
 * Organization Service
 * ============================================
 * Business logic for organization management
 */

import prisma from '../config/database.js';
import { hashPassword } from './auth.service.js';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * Generate a unique organization code
 */
function generateOrgCode(name) {
    const prefix = name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 4)
        .toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
}

/**
 * Generate URL-friendly slug from name
 */
function generateSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

/**
 * Create a new organization with admin
 */
export async function createOrganization(data, adminData) {
    const { name, address, city, state, contactEmail, contactPhone, website } = data;

    // Generate unique code and slug
    let code = generateOrgCode(name);
    let slug = generateSlug(name);

    // Check if organization with same name and city exists
    if (city) {
        const existingOrg = await prisma.organization.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                city: { equals: city, mode: 'insensitive' }
            }
        });

        if (existingOrg) {
            throw new ApiError(409, 'An organization with this name and city already exists.');
        }
    }

    // Ensure uniqueness
    let attempts = 0;
    while (attempts < 10) {
        const existing = await prisma.organization.findFirst({
            where: { OR: [{ code }, { slug }] },
        });
        if (!existing) break;
        code = generateOrgCode(name);
        slug = `${generateSlug(name)}-${Math.random().toString(36).substring(2, 4)}`;
        attempts++;
    }

    // Create organization and admin in a transaction
    return prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
            data: {
                name,
                code,
                slug,
                address,
                city,
                state,
                contactEmail: contactEmail || adminData.email,
                contactPhone,
                website,
            },
        });

        // Create admin for this organization
        const hashedPassword = await hashPassword(adminData.password);
        const admin = await tx.admin.create({
            data: {
                email: adminData.email,
                password: hashedPassword,
                name: adminData.name,
                phone: adminData.phone,
                role: 'ORG_ADMIN',
                organizationId: organization.id,
            },
        });

        return {
            organization,
            admin: { ...admin, password: undefined },
        };
    });
}

/**
 * Get organization by code (for students to join)
 */
export async function getOrganizationByCode(code) {
    const organization = await prisma.organization.findUnique({
        where: { code: code.toUpperCase() },
        select: {
            id: true,
            name: true,
            code: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            city: true,
            state: true,
            isActive: true,
            isVerified: true,
            _count: {
                select: { buses: true },
            },
        },
    });

    if (!organization || !organization.isActive) {
        return null;
    }

    return organization;
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug) {
    return prisma.organization.findUnique({
        where: { slug },
        select: {
            id: true,
            name: true,
            code: true,
            slug: true,
            logoUrl: true,
            bannerUrl: true,
            primaryColor: true,
            secondaryColor: true,
            city: true,
            state: true,
            contactEmail: true,
            contactPhone: true,
            website: true,
            isActive: true,
            isVerified: true,
        },
    });
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id) {
    return prisma.organization.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    buses: true,
                    drivers: true,
                    admins: true,
                },
            },
        },
    });
}

/**
 * Update organization details
 */
export async function updateOrganization(id, data) {
    const allowedFields = [
        'name', 'logoUrl', 'bannerUrl', 'primaryColor', 'secondaryColor',
        'address', 'city', 'state', 'contactEmail', 'contactPhone', 'website',
    ];

    const updateData = {};
    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    }

    // If name changed, update slug
    if (data.name) {
        let slug = generateSlug(data.name);
        const existing = await prisma.organization.findFirst({
            where: { slug, NOT: { id } },
        });
        if (existing) {
            slug = `${slug}-${Math.random().toString(36).substring(2, 4)}`;
        }
        updateData.slug = slug;
    }

    return prisma.organization.update({
        where: { id },
        data: updateData,
    });
}

/**
 * Regenerate organization join code
 */
export async function regenerateOrgCode(id) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new Error('Organization not found');

    let code = generateOrgCode(org.name);
    let attempts = 0;
    while (attempts < 10) {
        const existing = await prisma.organization.findFirst({
            where: { code, NOT: { id } },
        });
        if (!existing) break;
        code = generateOrgCode(org.name);
        attempts++;
    }

    return prisma.organization.update({
        where: { id },
        data: { code },
        select: { code: true },
    });
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId) {
    const [buses, drivers, admins] = await Promise.all([
        prisma.bus.count({ where: { organizationId, isActive: true } }),
        prisma.driver.count({ where: { organizationId, isActive: true } }),
        prisma.admin.count({ where: { organizationId, isActive: true } }),
    ]);

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            maxBuses: true,
            maxDrivers: true,
            subscriptionTier: true,
            subscriptionEnd: true,
        },
    });

    return {
        buses: {
            current: buses,
            limit: 999,
        },
        drivers: {
            current: drivers,
            limit: 999,
        },
        admins,
        subscription: {
            tier: 'FREE',
            expiresAt: null,
        },
    };
}

/**
 * Get all organizations (for super admin)
 */
export async function getAllOrganizations(options = {}) {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { buses: true, drivers: true, admins: true },
                },
            },
        }),
        prisma.organization.count({ where }),
    ]);

    return {
        organizations,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
}

/**
 * Get featured organizations for landing page
 */
export async function getFeaturedOrganizations(limit = 10) {
    return prisma.organization.findMany({
        where: {
            isActive: true,
            isVerified: true,
            logoUrl: { not: null },
        },
        select: {
            id: true,
            name: true,
            logoUrl: true,
            city: true,
            state: true,
            _count: {
                select: { buses: true },
            },
        },
        orderBy: {
            buses: { _count: 'desc' },
        },
        take: limit,
    });
}

/**
 * Verify organization (super admin)
 */
export async function verifyOrganization(id, verified = true) {
    return prisma.organization.update({
        where: { id },
        data: { isVerified: verified },
    });
}

// updateSubscription removed (Now fully free)
