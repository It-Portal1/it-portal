/**
 * IT Portal Backend – Main Server Entry Point
 * Konfiguriert Express App mit allen Middlewares und Routen
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import toolsRouter from './routes/tools';
import hostedRouter from './routes/hosted';
import settingsRouter from './routes/settings';
import { loginRateLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Sicherheits-Middlewares ──────────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Damit iframes funktionieren
    xFrameOptions: false, // Wir steuern X-Frame-Options manuell in den Routen (für /hosted)
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            frameSrc: ["'self'"],
        },
    },
}));

// CORS – nur Frontend-Origin erlaubt
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Cookies mitsenden
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── Upload-Verzeichnis sicherstellen ────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Statisches Hosting für hochgeladene HTML-Dateien ───────────────────────
app.use('/hosted', hostedRouter);

// ─── API-Routen ──────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginRateLimiter); // Rate limiting NUR auf Login
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/settings', settingsRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route nicht gefunden' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// ─── Server starten ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 IT Portal Backend läuft auf http://localhost:${PORT}`);
    console.log(`📁 Upload-Verzeichnis: ${uploadDir}`);
});

export default app;
