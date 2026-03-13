/**
 * Logs Routes
 * Endpunkte zum Abrufen der Audit-Logs
 */
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/logs - Audit-Logs abrufen (Nur Admin)
router.get('/', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nicht autorisiert' });

    try {
        const { limit = 50, page = 1, search, action } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};

        if (search) {
            where.OR = [
                { username: { contains: String(search) } },
                { resource: { contains: String(search) } },
                { action: { contains: String(search) } },
                { details: { contains: String(search) } },
            ];
        }

        if (action) {
            where.action = String(action);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                take: Number(limit),
                skip: skip,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: {
                            username: true,
                            email: true,
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        res.json({
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (err) {
        console.error('[Get Logs Error]', err);
        res.status(500).json({ error: 'Logs konnten nicht abgerufen werden' });
    }
});

export default router;
