import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

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
                role: true
            }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer' });
    }
});

// PUT /api/users/:id - Benutzer bearbeiten
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nur Admins können Benutzer bearbeiten' });

    const { id } = req.params;
    const { username, email, roleId, isActive, password } = req.body;

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
            roleId,
            isActive
        };

        // Passwort nur updaten, wenn eines gesendet wurde
        if (password && password.trim() !== '') {
            data.passwordHash = await bcrypt.hash(password, 12);
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data
        });

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
        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
});

export default router;