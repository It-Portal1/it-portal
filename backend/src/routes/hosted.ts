import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

import prisma from '../lib/prisma';

router.get('/:idOrSlug', async (req, res) => {
    const { idOrSlug } = req.params;

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

        const filePath = path.join(uploadDir, tool.filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Datei auf dem Server nicht gefunden');
        }

        // WICHTIG: Erlaube das Einbetten im iFrame
        res.setHeader('Content-Security-Policy', "frame-ancestors *");
        res.removeHeader('X-Frame-Options');

        res.sendFile(filePath);
    } catch (error) {
        console.error('[Hosted Route Error]', error);
        res.status(500).send('Interner Serverfehler beim Laden der Datei');
    }
});

export default router;