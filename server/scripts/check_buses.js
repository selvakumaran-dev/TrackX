
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const buses = await prisma.bus.findMany({
        include: {
            organization: true
        }
    });
    console.log('Total Buses:', buses.length);
    buses.forEach(b => {
        console.log(`- Bus: ${b.busNumber} (${b.busName}), Org: ${b.organization.name} (${b.organization.code}), Active: ${b.isActive}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
