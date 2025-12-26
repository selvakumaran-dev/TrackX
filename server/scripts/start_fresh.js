/**
 * ============================================
 * TrackX Platinum Start Fresh Script
 * ============================================
 * Wipes all institutional data while preserving 
 * the Super Admin and Master Infrastructure.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function startFresh() {
    console.log('🚀 Initiating Platinum Fresh Start...');
    console.log('------------------------------------');

    try {
        // 1. Find the Super Admin to preserve
        const superAdmin = await prisma.admin.findFirst({
            where: { email: 'root@trackx.com' }
        });

        if (!superAdmin) {
            console.error('❌ Critical Error: Super Admin account not found. Run "npm run seed" first.');
            process.exit(1);
        }

        const masterOrgId = superAdmin.organizationId;
        console.log(`🛡️  Preserving Super Admin: ${superAdmin.email}`);
        if (masterOrgId) {
            console.log(`🏢 Preserving Master Organization ID: ${masterOrgId}`);
        }

        // 2. Clear transactional data first (Order matters for constraints)
        console.log('🗑️  Clearing telemetry logs...');
        await prisma.gpsLog.deleteMany({});

        console.log('🗑️  Clearing route stops...');
        await prisma.busStop.deleteMany({});

        console.log('🗑️  Clearing authentication tokens...');
        await prisma.refreshToken.deleteMany({});

        // 3. Clear entities (Buses, Drivers, Admins)
        // Note: MongoDB/Prisma unique constraints on Nullable fields (like Driver.busId) 
        // can cause issues if not handled carefully.

        console.log('🗑️  Clearing all institutional drivers...');
        await prisma.driver.deleteMany({});

        console.log('🗑️  Clearing all institutional buses...');
        await prisma.bus.deleteMany({});

        console.log('🗑️  Clearing sub-admins...');
        await prisma.admin.deleteMany({
            where: {
                id: { not: superAdmin.id }
            }
        });

        // 4. Clear organizations (Except Master)
        console.log('🗑️  Clearing all other organizations...');
        if (masterOrgId) {
            await prisma.organization.deleteMany({
                where: {
                    id: { not: masterOrgId }
                }
            });

            // Clean up Master Org details if needed (Brand update)
            await prisma.organization.update({
                where: { id: masterOrgId },
                data: {
                    name: 'TrackX Global Infrastructure',
                    code: 'TRACKX',
                    slug: 'trackx-global',
                    city: 'Platinum HQ',
                    state: 'Engineering',
                    isActive: true,
                    isVerified: true
                }
            });
        } else {
            await prisma.organization.deleteMany({});
        }

        console.log('------------------------------------');
        console.log('✨ PLATINUM FRESH START COMPLETE');
        console.log('🚀 Only Super Admin & Master Org remain.');
        console.log('💡 System is ready for new deployments.');

    } catch (error) {
        console.error('❌ Platinum Fresh Start Failed:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

startFresh();
