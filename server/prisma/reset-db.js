/**
 * ============================================
 * Database Fresh Start Script (MongoDB)
 * ============================================
 * Wipes all data to start with a completely empty database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Wiping all data from TrackX database...');

    try {
        // Delete everything in reverse order of expected dependency (though MongoDB is flexible)
        await prisma.refreshToken.deleteMany({});
        console.log('✅ Tokens cleared');

        await prisma.gpsLog.deleteMany({});
        console.log('✅ GPS logs cleared');

        await prisma.busStop.deleteMany({});
        console.log('✅ Bus stops cleared');

        await prisma.driver.deleteMany({});
        console.log('✅ Drivers cleared');

        await prisma.bus.deleteMany({});
        console.log('✅ Buses cleared');

        await prisma.admin.deleteMany({});
        console.log('✅ Admins cleared');

        await prisma.organization.deleteMany({});
        console.log('✅ Organizations cleared');

        console.log('\n✨ Database is now completely empty.');
        console.log('🚀 You are ready for a fresh start with 0 users.');
    } catch (error) {
        console.error('❌ Error wiping database:', error);
    }
}

main()
    .catch((e) => {
        console.error('❌ Script error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
