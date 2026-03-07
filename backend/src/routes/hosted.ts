import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

router.get('/:filename', (req, res) => {
    const { filename } = req.params;

    // Einfacher Schutz gegen Directory Traversal
    const safeName = path.basename(filename);
    const filePath = path.join(uploadDir, safeName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Datei nicht gefunden');
    }

    // WICHTIG: Erlaube das Einbetten im iFrame für localhost:3000 und die eigene Domain
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.removeHeader('X-Frame-Options'); // Entfernt strikte Blockaden, falls global gesetzt

    res.sendFile(filePath);
});

export default router;