/**
 * Clear all data from the database
 * Use this for a fresh start
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
    console.log('🗑️  Clearing all data...');
    console.log('');

    // Delete in order to respect foreign key constraints
    console.log('  → Deleting GPS logs...');
    const gpsLogs = await prisma.gpsLog.deleteMany({});
    console.log(`    Deleted ${gpsLogs.count} GPS logs`);

    console.log('  → Deleting bus stops...');
    const busStops = await prisma.busStop.deleteMany({});
    console.log(`    Deleted ${busStops.count} bus stops`);

    console.log('  → Deleting buses...');
    const buses = await prisma.bus.deleteMany({});
    console.log(`    Deleted ${buses.count} buses`);

    console.log('  → Deleting refresh tokens...');
    const tokens = await prisma.refreshToken.deleteMany({});
    console.log(`    Deleted ${tokens.count} refresh tokens`);

    console.log('  → Deleting drivers...');
    const drivers = await prisma.driver.deleteMany({});
    console.log(`    Deleted ${drivers.count} drivers`);

    console.log('  → Deleting admins...');
    const admins = await prisma.admin.deleteMany({});
    console.log(`    Deleted ${admins.count} admins`);

    console.log('  → Deleting organizations...');
    const orgs = await prisma.organization.deleteMany({});
    console.log(`    Deleted ${orgs.count} organizations`);

    console.log('');
    console.log('✅ All data cleared successfully!');
    console.log('');
    console.log('🚀 Database is now empty and ready for fresh registration.');
    console.log('   Go to /register to create a new organization.');

    await prisma.$disconnect();
}

clearAllData().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
