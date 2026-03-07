/**
 * Auth Routes: Login, Logout, Refresh, Me
 * Alle Endpunkte für Authentifizierung
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import {
    signAccessToken,
    signRefreshToken,
    refreshTokens,
    getUserPermissions,
} from '../lib/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();

const COOKIE_OPTIONS = {
    httpOnly: true,     // JavaScript kann nicht drauf zugreifen (XSS-Schutz)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Tage
};

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
            return;
        }

        // Benutzer suchen (nach Username oder E-Mail)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username.toLowerCase() },
                    { email: username.toLowerCase() },
                ],
                isActive: true,
            },
            include: {
                role: {
                    include: { permissions: true }
                },
                userPermissions: true,
            },
        });

        // Timing-sicherer Vergleich: Immer bcrypt.compare ausführen
        const dummyHash = '$2b$12$dummy.hash.for.timing.safety.only.placeholder';
        const isValid = user
            ? await bcrypt.compare(password, user.passwordHash)
            : await bcrypt.compare(password, dummyHash);

        if (!user || !isValid) {
            res.status(401).json({ error: 'Ungültige Anmeldedaten' });
            return;
        }

        const permissions = getUserPermissions(user);
        const accessToken = signAccessToken({
            userId: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            permissions,
        });
        const refreshToken = await signRefreshToken(user.id);

        // Refresh-Token als httpOnly Cookie setzen
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

        res.json({
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                requirePasswordChange: user.requirePasswordChange,
                role: user.role,
                permissions,
            },
        });
    } catch (err) {
        console.error('[Login Error]', err);
        res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
    }
});

// POST /api/auth/refresh – Neues Access-Token anfordern
router.post('/refresh', async (req: Request, res: Response) => {
    try {
        const oldRefreshToken = req.cookies?.refreshToken;
        if (!oldRefreshToken) {
            res.status(401).json({ error: 'Kein Refresh-Token vorhanden' });
            return;
        }

        const { accessToken, refreshToken } = await refreshTokens(oldRefreshToken);

        // Neues Refresh-Token als Cookie setzen
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({ accessToken });
    } catch {
        res.clearCookie('refreshToken');
        res.status(401).json({ error: 'Token konnte nicht erneuert werden' });
    }
});

// POST /api/auth/logout – Session beenden
router.post('/logout', authenticate, async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            // Refresh-Token aus der DB löschen
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.clearCookie('refreshToken');
        res.json({ message: 'Erfolgreich abgemeldet' });
    } catch {
        res.status(500).json({ error: 'Logout fehlgeschlagen' });
    }
});

// GET /api/auth/me – Aktuellen Benutzer zurückgeben
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            include: { role: { include: { permissions: true } }, userPermissions: true },
        });

        if (!user) {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
            return;
        }

        const permissions = getUserPermissions(user);

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            isActive: user.isActive,
            requirePasswordChange: user.requirePasswordChange,
            role: user.role,
            permissions,
            createdAt: user.createdAt,
        });
    } catch {
        res.status(500).json({ error: 'Fehler beim Abrufen des Benutzers' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ error: 'Das neue Passwort muss mindestens 8 Zeichen haben' });
            return;
        }

        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        if (!user) {
            res.status(404).json({ error: 'Benutzer nicht gefunden' });
            return;
        }

        // Aktuelles Passwort verifizieren
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: 'Das aktuelle Passwort ist falsch' });
            return;
        }

        // Neues Passwort hashen & requirePasswordChange entfernen
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                requirePasswordChange: false
            }
        });

        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (err) {
        console.error('[Change Password Error]', err);
        res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
    }
});

export default router;
