/**
 * ============================================
 * Database Seed Script (MongoDB)
 * ============================================
 * Seeds the database with initial data
 * Note: For standalone MongoDB (non-replica set)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
        where: { email: 'admin@trackx.com' }
    });

    if (existingAdmin) {
        console.log('⚠️  Database already seeded. Skipping...');
        console.log('');
        console.log('📋 Test Credentials:');
        console.log('   Admin: admin@trackx.com / admin123');
        console.log('   Driver: (any driver email) / driver');
        return;
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.admin.create({
        data: {
            email: 'admin@trackx.com',
            password: adminPassword,
            name: 'System Admin',
            role: 'SUPER_ADMIN',
        },
    });
    console.log('✅ Created admin:', admin.email);

    // Create buses first (without drivers)
    const bus1 = await prisma.bus.create({
        data: {
            busNumber: 'BUS-001',
            busName: 'Route A - Engineering Block',
            gpsDeviceId: 'GPS-DEVICE-001',
            apiKey: 'trackx_bus_001_apikey_demo12345',
        },
    });
    console.log('✅ Created bus:', bus1.busNumber);

    const bus2 = await prisma.bus.create({
        data: {
            busNumber: 'BUS-002',
            busName: 'Route B - Science Block',
        },
    });
    console.log('✅ Created bus:', bus2.busNumber);

    const bus3 = await prisma.bus.create({
        data: {
            busNumber: 'BUS-003',
            busName: 'Route C - Arts Block',
        },
    });
    console.log('✅ Created bus:', bus3.busNumber);

    const bus4 = await prisma.bus.create({
        data: {
            busNumber: 'BUS-004',
            busName: 'Route D - Hostel',
        },
    });
    console.log('✅ Created bus:', bus4.busNumber);

    // Create drivers with bus assignments
    const driverPassword = await bcrypt.hash('driver', 12);

    const driver1 = await prisma.driver.create({
        data: {
            email: 'kumar@trackx.com',
            password: driverPassword,
            name: 'Rajesh Kumar',
            phone: '+91 98765 43210',
            busId: bus1.id,
        },
    });
    console.log('✅ Created driver:', driver1.name);

    const driver2 = await prisma.driver.create({
        data: {
            email: 'singh@trackx.com',
            password: driverPassword,
            name: 'Vikram Singh',
            phone: '+91 98765 43211',
            busId: bus2.id,
        },
    });
    console.log('✅ Created driver:', driver2.name);

    const driver3 = await prisma.driver.create({
        data: {
            email: 'sharma@trackx.com',
            password: driverPassword,
            name: 'Amit Sharma',
            phone: '+91 98765 43212',
            busId: bus3.id,
        },
    });
    console.log('✅ Created driver:', driver3.name);

    // Create sample GPS logs
    const now = new Date();

    await prisma.gpsLog.create({
        data: {
            latitude: 12.9716,
            longitude: 77.5946,
            speed: 35,
            heading: Math.random() * 360,
            source: 'DEVICE',
            timestamp: now,
            busId: bus1.id,
            driverId: driver1.id,
        },
    });

    await prisma.gpsLog.create({
        data: {
            latitude: 12.9352,
            longitude: 77.6245,
            speed: 42,
            heading: Math.random() * 360,
            source: 'DEVICE',
            timestamp: now,
            busId: bus2.id,
            driverId: driver2.id,
        },
    });

    await prisma.gpsLog.create({
        data: {
            latitude: 12.9698,
            longitude: 77.7500,
            speed: 28,
            heading: Math.random() * 360,
            source: 'DEVICE',
            timestamp: now,
            busId: bus3.id,
            driverId: driver3.id,
        },
    });

    console.log('✅ Created sample GPS logs');

    console.log('');
    console.log('🎉 Database seeded successfully!');
    console.log('');
    console.log('📋 Test Credentials:');
    console.log('   Admin: admin@trackx.com / admin123');
    console.log('   Driver: (any driver email) / driver');
    console.log('');
    console.log('🚌 Sample Buses: BUS-001, BUS-002, BUS-003, BUS-004');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
