/**
 * Promote Admin to SuperAdmin
 * Usage: node server/src/scripts/promote.js <email>
 */

import 'dotenv/config';
import { prisma } from '../config/database.js';

const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address.');
    process.exit(1);
}

async function promote() {
    try {
        const admin = await prisma.admin.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!admin) {
            console.error(`❌ Admin with email ${email} not found.`);
            process.exit(1);
        }

        await prisma.admin.update({
            where: { id: admin.id },
            data: { role: 'SUPER_ADMIN' }
        });

        console.log(`✅ Success: ${email} has been promoted to SUPER_ADMIN.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error promoting admin:', error);
        process.exit(1);
    }
}

promote();
