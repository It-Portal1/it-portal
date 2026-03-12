import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
const SETTINGS_ID = 'system-settings';

// GET /api/settings - Einstellungen abrufen (Öffentlich, für Theme/Logo)
router.get('/', async (req: Request, res: Response) => {
    try {
        let settings = await prisma.setting.findUnique({
            where: { id: SETTINGS_ID }
        });

        if (!settings) {
            // Falls keine existieren, Standardwerte anlegen
            settings = await prisma.setting.create({
                data: { id: SETTINGS_ID }
            });
        }

        res.json(settings);
    } catch (err) {
        console.error('[Get Settings Error]', err);
        res.status(500).json({ error: 'Einstellungen konnten nicht abgerufen werden' });
    }
});

// PUT /api/settings - Einstellungen aktualisieren (Nur Admin)
router.put('/', authenticate, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Nur Administratoren können Einstellungen ändern' });
    }

    const {
        appName,
        subtitle,
        logoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        loginTitle,
        loginSubtitle,
        fontFamily
    } = req.body;

    try {
        const updated = await prisma.setting.upsert({
            where: { id: SETTINGS_ID },
            update: {
                appName,
                subtitle,
                logoUrl,
                primaryColor,
                secondaryColor,
                accentColor,
                loginTitle,
                loginSubtitle,
                fontFamily
            },
            create: {
                id: SETTINGS_ID,
                appName,
                subtitle,
                logoUrl,
                primaryColor,
                secondaryColor,
                accentColor,
                loginTitle,
                loginSubtitle,
                fontFamily
            }
        });

        res.json(updated);
    } catch (err) {
        console.error('[Update Settings Error]', err);
        res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
    }
});

export default router;