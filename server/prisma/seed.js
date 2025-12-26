/**
 * ============================================
 * Database Seed Script (Placeholder)
 * ============================================
 * Empty seed script for a clean slate.
 * Add initial data here if needed in the future.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seed script running...');

    // Create Master Organization
    const masterOrg = await prisma.organization.upsert({
        where: { code: 'TRACKX' },
        update: {},
        create: {
            name: 'TrackX Global Infrastructure',
            code: 'TRACKX',
            slug: 'trackx-global',
            city: 'HQ',
            state: 'Tamil Nadu',
            isActive: true,
            isVerified: true
        }
    });
    console.log('✅ Master Organization verified');

    // Create Super Admin
    // Using a hashed password for security: 'Admin@123'
    const adminEmail = 'root@trackx.com';
    const existingAdmin = await prisma.admin.findUnique({
        where: { email: adminEmail }
    });

    if (!existingAdmin) {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('Admin@123', 10);
        await prisma.admin.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'TrackX System Admin',
                role: 'SUPER_ADMIN',
                organizationId: masterOrg.id
            }
        });
        console.log('✅ Super Admin created (root@trackx.com / Admin@123)');
    } else {
        console.log('ℹ️ Super Admin already exists');
    }
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
