import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';

const router = Router();
const settingsPath = path.join(__dirname, '..', '..', 'settings.json');

const defaultSettings = {
    appName: 'IT Portal',
    subtitle: 'Schul-IT Management',
    icon: 'Monitor'
};

const getSettings = () => {
    if (!fs.existsSync(settingsPath)) return defaultSettings;
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
        return defaultSettings;
    }
};

router.get('/', (req: Request, res: Response) => {
    res.json(getSettings());
});

router.put('/', authenticate, (req: Request, res: Response) => {
    // @ts-ignore
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Nur Administratoren können Einstellungen ändern' });
    }

    const current = getSettings();
    const { appName, subtitle, icon } = req.body;

    const newSettings = {
        ...current,
        ...(appName && { appName }),
        ...(subtitle && { subtitle }),
        ...(icon && { icon })
    };

    try {
        fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
        res.json(newSettings);
    } catch (err) {
        res.status(500).json({ error: 'Einstellungen konnten nicht gespeichert werden' });
    }
});

export default router;