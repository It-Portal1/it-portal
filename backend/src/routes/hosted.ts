import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

import prisma from '../lib/prisma';
import { logEvent } from '../lib/audit';

router.get('/:idOrSlug*', async (req: any, res) => {
    const idOrSlug = req.params.idOrSlug;
    const subPath = req.params[0] ?? '';

    // Wir loggen nur den Basis-Aufruf (ohne subPath), um Logs nicht zu fluten (z.B. Bilder in HTML)
    if (!subPath) {
        // req.user wird hier evtl. durch optionalAuthenticate (falls in server.ts davor) gesetzt
        await logEvent(req, 'ACCESS_HOSTED_TOOL', idOrSlug);
    }

    // Falls die Basis-URL ohne Slash aufgerufen wird, Redirect auf Version mit Slash
    // Wichtig für relative Pfade im HTML (z.B. <img src="logo.png">)
    if (!subPath && !req.url.endsWith('/')) {
        return res.redirect(301, req.originalUrl + '/');
    }

    const cleanSubPath = subPath.replace(/^\//, '');

    try {
        const tool = await prisma.tool.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (!tool || !tool.filePath) {
            return res.status(404).send('Tool oder Datei nicht gefunden');
        }

        let finalFilePath = path.join(uploadDir, tool.filePath);

        // Falls es ein Unterordner/Asset ist
        if (subPath) {
            const toolBaseDir = path.dirname(finalFilePath);
            finalFilePath = path.join(toolBaseDir, subPath);
        }

        if (!fs.existsSync(finalFilePath)) {
            return res.status(404).send('Datei auf dem Server nicht gefunden');
        }

        // Sicherheitscheck: Verhindere Directory Traversal
        const toolDirRoot = path.dirname(path.join(uploadDir, tool.filePath));
        if (!finalFilePath.startsWith(toolDirRoot)) {
            return res.status(403).send('Zugriff verweigert');
        }

        // WICHTIG: Erlaube das Einbetten im iFrame
        res.setHeader('Content-Security-Policy', "frame-ancestors *");
        res.removeHeader('X-Frame-Options');

        res.sendFile(finalFilePath);
    } catch (error) {
        console.error('[Hosted Route Error]', error);
        res.status(500).send('Interner Serverfehler beim Laden der Datei');
    }
});

export default router;