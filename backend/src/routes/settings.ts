import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { logEvent } from '../lib/audit';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const SETTINGS_ID = 'system-settings';

// ─── Multer Upload-Konfiguration für Branding ───────────────────────────────
// ─── Multer Upload-Konfiguration für Branding ───────────────────────────────
const uploadRoot = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
const brandingDir = path.join(uploadRoot, 'branding');

if (!fs.existsSync(brandingDir)) {
    fs.mkdirSync(brandingDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, brandingDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `logo-${Date.now()}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB Max
    fileFilter: (_req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
            cb(new Error(`Ungültiger Dateityp: ${ext}. Erlaubt sind: ${allowed.join(', ')}`));
            return;
        }
        cb(null, true);
    },
});

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

        await logEvent(req, 'UPDATE_SETTINGS', 'System-Einstellungen', { appName });

        res.json(updated);
    } catch (err) {
        console.error('[Update Settings Error]', err);
        res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
    }
});

// POST /api/settings/logo - Logo hochladen (Nur Admin)
router.post('/logo', authenticate, upload.single('logo'), async (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Nicht autorisiert' });

    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    try {
        const logoUrl = `/uploads/branding/${req.file.filename}`;

        // Automatisch in Settings speichern
        await prisma.setting.upsert({
            where: { id: SETTINGS_ID },
            update: { logoUrl },
            create: { id: SETTINGS_ID, logoUrl }
        });

        await logEvent(req, 'UPDATE_LOGO', 'System-Logo', { logoUrl });

        res.json({ logoUrl, message: 'Logo erfolgreich hochgeladen' });
    } catch (err) {
        console.error('[Logo Upload Error]', err);
        res.status(500).json({ error: 'Fehler beim Speichern des Logos' });
    }
});

export default router;
