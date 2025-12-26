/**
 * TrackX Master Initialization Script
 * Creates the primary Root Authority (SuperAdmin)
 * Usage: node server/src/scripts/create-root.js <email> <password> <name>
 */

import 'dotenv/config';
import { prisma } from '../config/database.js';
import { hashPassword } from '../services/auth.service.js';

const email = process.argv[2] || 'root@trackx.com';
const password = process.argv[3] || 'master-trackx-2024';
const name = process.argv[4] || 'Master Root';

async function createRoot() {
    try {
        console.log('🚀 Initializing TrackX Root Authority...');

        // 1. Ensure a System Organization exists (for global management)
        let systemOrg = await prisma.organization.findFirst({
            where: { code: 'MASTER' }
        });

        if (!systemOrg) {
            console.log('🏢 Creating Master Systems Organization...');
            systemOrg = await prisma.organization.create({
                data: {
                    name: 'TrackX Global Infrastructure',
                    code: 'MASTER',
                    slug: 'trackx-global',
                    isVerified: true,
                    isActive: true,
                    subscriptionTier: 'ENTERPRISE',
                    primaryColor: '#6366f1'
                }
            });
        }

        // 2. Check if this root user already exists
        const existingRoot = await prisma.admin.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingRoot) {
            console.log(`⚠️ User ${email} already exists. Promoting to SUPER_ADMIN...`);
            await prisma.admin.update({
                where: { id: existingRoot.id },
                data: {
                    role: 'SUPER_ADMIN',
                    organizationId: systemOrg.id
                }
            });
        } else {
            console.log(`👤 Creating New Root User: ${email}...`);
            const hashedPassword = await hashPassword(password);
            await prisma.admin.create({
                data: {
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    name: name,
                    role: 'SUPER_ADMIN',
                    organizationId: systemOrg.id,
                    isActive: true
                }
            });
        }

        console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   💎 ROOT AUTHORITY ESTABLISHED                ║
║                                                ║
║   Email: ${email}                  ║
║   Password: ${password}                     ║
║   Access Path: /superadmin                     ║
║                                                ║
╚════════════════════════════════════════════════╝
        `);
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to establish root:', error);
        process.exit(1);
    }
}

createRoot();
