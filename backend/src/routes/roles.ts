/**
 * Role Management Routes
 * CRUD-Operationen für Rollen (nur Admin)
 */
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { Permission } from '@prisma/client';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/roles
router.get('/', async (_req: Request, res: Response) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                _count: { select: { users: true } },
                permissions: true
            },
            orderBy: { name: 'asc' },
        });

        // Map Permissions to string array
        const mappedRoles = roles.map(r => ({
            ...r,
            permissions: r.permissions.map(p => p.permission)
        }));

        res.json(mappedRoles);
    } catch (err) {
        console.error('Error fetching roles:', err);
        res.status(500).json({ error: 'Rollen konnten nicht abgerufen werden' });
    }
});

// POST /api/roles
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Rollenname erforderlich' });
            return;
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
                permissions: {
                    create: (permissions || []).map((p: any) => ({ permission: p }))
                },
            },
            include: { permissions: true }
        });

        const mappedRole = {
            ...role,
            permissions: role.permissions.map(p => p.permission)
        };
        res.status(201).json(mappedRole);
    } catch (err) {
        console.error('Error creating role:', err);
        res.status(500).json({ error: 'Rolle konnte nicht erstellt werden' });
    }
});

// PUT /api/roles/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { name, description, permissions } = req.body;

        const role = await prisma.role.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(permissions && {
                    permissions: {
                        deleteMany: {},
                        create: (permissions as Permission[]).map(p => ({ permission: p }))
                    }
                }),
            },
            include: { permissions: true }
        });

        const mappedRole = {
            ...role,
            permissions: role.permissions.map(p => p.permission)
        };
        res.json(mappedRole);
    } catch (err) {
        console.error('Error updating role:', err);
        res.status(500).json({ error: 'Rolle konnte nicht aktualisiert werden' });
    }
});

// DELETE /api/roles/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.role.delete({ where: { id: req.params.id } });
        res.json({ message: 'Rolle gelöscht' });
    } catch {
        res.status(500).json({ error: 'Rolle konnte nicht gelöscht werden' });
    }
});

export default router;
