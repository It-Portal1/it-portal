/**
 * Prisma Client Singleton
 * Verhindert mehrfache Instanzen während Hot-Reload in Entwicklung
 */
import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

const prisma = global.__prisma ?? new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

export default prisma;
