import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { logEvent } from '../lib/audit';

const router = Router();

// GET /api/users - Alle Benutzer auflisten (Nur Admin)
router.get('/', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Zugriff verweigert' });

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                isAdmin: true,
                isActive: true,
                roleId: true,
                requirePasswordChange: true,
                role: true,
                userPermissions: true,
                toolAccess: true
            }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer' });
    }
});

// POST /api/users - Neuen Benutzer erstellen (Nur Admin)
router.post('/', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nur Admins können Benutzer erstellen' });

    const { username, email, password, roleId, isAdmin, isActive, requirePasswordChange, permissions, toolIds } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, Email und Passwort sind erforderlich' });
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ username }, { email }] }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Benutzername oder Email bereits vergeben' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await prisma.user.create({
            // ... (rest of data)
            data: {
                username,
                email,
                passwordHash,
                roleId: roleId || null,
                isAdmin: !!isAdmin,
                isActive: isActive !== false,
                requirePasswordChange: !!requirePasswordChange,
                userPermissions: {
                    create: permissions?.map((p: any) => ({ permission: p })) || []
                },
                toolAccess: {
                    create: toolIds?.map((tId: any) => ({ toolId: tId })) || []
                }
            },
            select: {
                id: true,
                username: true,
                email: true,
                isAdmin: true,
                isActive: true,
            }
        });

        await logEvent(req, 'CREATE_USER', username, { email, isAdmin });

        res.status(201).json(newUser);
    } catch (err) {
        console.error('[User Creation Error]', err);
        res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers' });
    }
});

// PUT /api/users/:id - Benutzer bearbeiten
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nur Admins können Benutzer bearbeiten' });

    const { id } = req.params;
    const { username, email, roleId, isActive, password, isAdmin, requirePasswordChange, permissions, toolIds } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        // SCHUTZ: Der Haupt-Admin (username 'admin') hat spezielle Regeln
        if (user.username.toLowerCase() === 'admin') {
            // 1. Username darf nicht geändert werden
            if (username && username.toLowerCase() !== 'admin') {
                return res.status(403).json({ error: 'Der Benutzername des Haupt-Administrators kann nicht geändert werden.' });
            }
            // 2. Darf nicht deaktiviert werden
            if (isActive === false) {
                return res.status(403).json({ error: 'Der Haupt-Administrator kann nicht deaktiviert werden.' });
            }
        }

        const data: any = {
            username,
            email,
            roleId: roleId || null,
            isActive,
            isAdmin,
            requirePasswordChange
        };

        // Passwort nur updaten, wenn eines gesendet wurde
        if (password && password.trim() !== '') {
            data.passwordHash = await bcrypt.hash(password, 12);
        }

        // Berechtigungen und Tool-Zugriff aktualisieren (Löschen und Neu-Erstellen für Einfachheit)
        if (permissions) {
            await prisma.userPermission.deleteMany({ where: { userId: id } });
            data.userPermissions = {
                create: permissions.map((p: any) => ({ permission: p }))
            };
        }

        if (toolIds) {
            await prisma.toolUserAccess.deleteMany({ where: { userId: id } });
            data.toolAccess = {
                create: toolIds.map((tId: any) => ({ toolId: tId }))
            };
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                username: true,
                email: true,
                isAdmin: true,
                isActive: true,
                role: true,
                userPermissions: true
            }
        });

        await logEvent(req, 'UPDATE_USER', updatedUser.username, { email: updatedUser.email });

        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzers' });
    }
});

// DELETE /api/users/:id - Benutzer löschen
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nur Admins können Benutzer löschen' });

    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        // SCHUTZ: Der Haupt-Admin darf nicht gelöscht werden
        if (user.username.toLowerCase() === 'admin') {
            return res.status(403).json({ error: 'Der Haupt-Administrator "admin" darf nicht gelöscht werden. Dieser Benutzer ist systemrelevant.' });
        }

        await prisma.user.delete({ where: { id } });
        await logEvent(req, 'DELETE_USER', user.username);
        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
});

export default router;