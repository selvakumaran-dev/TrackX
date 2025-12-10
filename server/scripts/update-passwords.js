/**
 * Update all driver passwords to 'driver'
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePasswords() {
    try {
        const password = await bcrypt.hash('driver', 12);
        const result = await prisma.driver.updateMany({
            data: { password }
        });
        console.log('✅ Updated', result.count, 'drivers with password: driver');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updatePasswords();
