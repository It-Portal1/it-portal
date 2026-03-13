/**
 * Audit Logging Utility
 * Records user activities into the database
 */
import { Request } from 'express';
import prisma from './prisma';

export async function logEvent(
    req: Request | any,
    action: string,
    resource?: string,
    details?: any
) {
    try {
        const userId = req.user?.userId;
        const username = req.user?.username;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                username: username || null,
                action,
                resource: resource || null,
                details: details ? JSON.stringify(details) : null,
                ipAddress: String(ipAddress),
            },
        });
    } catch (err) {
        console.error('Failed to log audit event:', err);
    }
}
