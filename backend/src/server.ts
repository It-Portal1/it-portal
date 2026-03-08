/**
 * IT Portal Backend – Main Server Entry Point
 * Konfiguriert Express App mit allen Middlewares und Routen
 */
import dotenv from 'dotenv';
// WICHTIG: .env muss geladen werden, BEVOR andere Module (wie Prisma) importiert werden!
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { Permission } from '@prisma/client';
import prisma from './lib/prisma';

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import toolsRouter from './routes/tools';
import hostedRouter from './routes/hosted';
import settingsRouter from './routes/settings';
import { loginRateLimiter } from './middleware/rateLimiter';

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

// CORS – Erlaubte Origins definieren
const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.2.110:3000', // Dev Server über IP
    'http://192.168.2.110',      // Nginx / Produktion
    'http://it-portal.jona-s.com',
    'https://it-portal.jona-s.com',
    process.env.FRONTEND_URL     // Aus .env Datei
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // !origin erlaubt Anfragen ohne Origin (z.B. Postman oder Server-zu-Server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`⚠️ CORS blockiert Anfrage von: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
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

// Debug-Logging: Zeigt jede Anfrage in der Konsole an
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// ─── Health Check (frühzeitig, damit er immer erreichbar ist) ────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API-Routen ──────────────────────────────────────────────────────────────
app.use('/api/auth/login', loginRateLimiter); // Rate limiting NUR auf Login
app.use('/api/login', loginRateLimiter);      // Fallback Rate limiting
app.use('/api/auth', authRouter);
app.use('/api', authRouter);                  // Fallback für /api/login statt /api/auth/login
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/settings', settingsRouter);

// ─── Fallback für Nginx (falls /api Prefix entfernt wird) ─────────────────────
app.use('/auth/login', loginRateLimiter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/roles', rolesRouter);
app.use('/tools', toolsRouter);
app.use('/settings', settingsRouter);

// ─── Absolute Fallback (falls Nginx Pfade komplett umschreibt) ────────────────
app.use('/login', loginRateLimiter);
app.use('/', authRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    console.warn(`⚠️ 404 - Route nicht gefunden: ${req.method} ${req.url}`);
    console.warn(`   Host: ${req.headers.host}`);
    res.status(404).json({ error: 'Route nicht gefunden', path: req.url });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// ─── Admin-User beim Start sicherstellen ─────────────────────────────────────
async function ensureAdminUser() {
    try {
        // 1. Admin-Rolle sicherstellen
        const adminRole = await prisma.role.upsert({
            where: { name: 'Admin' },
            update: {},
            create: {
                name: 'Admin',
                description: 'System Administrator',
                permissions: { create: Object.values(Permission).map(p => ({ permission: p })) }
            }
        });

        // 2. Admin-User prüfen (NICHT überschreiben, wenn er schon existiert!)
        const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } });

        if (!existingAdmin) {
            const passwordHash = await bcrypt.hash('mpipwmkbe3521!', 12);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    email: 'admin@itportal.local',
                    passwordHash,
                    isAdmin: true,
                    isActive: true,
                    roleId: adminRole.id,
                    requirePasswordChange: false
                }
            });
            console.log('\n┌──────────────────────────────────────────────────────┐');
            console.log('│ 🔐 Admin-Benutzer wurde neu erstellt                 │');
            console.log('│    Benutzername: admin                               │');
            console.log('│    Passwort:     mpipwmkbe3521!                      │');
            console.log('└──────────────────────────────────────────────────────┘\n');
        } else {
            console.log('ℹ️ Admin-Benutzer existiert bereits (Passwort wurde beibehalten).');
        }
    } catch (error) {
        console.error('⚠️ Konnte Admin-User nicht verifizieren:', error);
        console.error('\n👉 TIPP: Läuft die Datenbank? Führe "docker compose up -d" im Hauptverzeichnis aus.\n');
        console.error('👉 TIPP: Sind die Tabellen erstellt? Führe "npx prisma db push" im backend-Ordner aus.\n');
    }
}

// ─── Server starten ──────────────────────────────────────────────────────────
ensureAdminUser().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 IT Portal Backend läuft auf http://localhost:${PORT}`);
        console.log(`📁 Upload-Verzeichnis: ${uploadDir}`);
    });
});

export default app;
