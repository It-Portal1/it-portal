const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL }
    }
});

async function main() {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    try {
        await prisma.$connect();
        console.log('✅ Connected!');
        const roles = await prisma.role.findMany();
        console.log('Roles:', roles);
    } catch (e) {
        console.error('❌ Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
