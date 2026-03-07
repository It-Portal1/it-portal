import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL }
    }
});

async function test() {
    try {
        await prisma.$connect();
        console.log('✅ Connection successful');
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (err) {
        console.error('❌ Connection failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
