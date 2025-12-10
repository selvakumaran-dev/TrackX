/**
 * ============================================
 * Prisma Database Client Configuration
 * ============================================
 * Singleton pattern for Prisma client to prevent
 * multiple instances during hot reloading
 */

import { PrismaClient } from '@prisma/client';

// Create a global reference for the Prisma client
const globalForPrisma = globalThis;

/**
 * Initialize Prisma Client with logging configuration
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
