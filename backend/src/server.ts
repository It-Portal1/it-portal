/**
 * IT Portal Backend – Main Server Entry Point
 * Konfiguriert Express App mit allen Middlewares und Routen
 */
import dotenv from 'dotenv';
import path from 'path';

// ─── 1. Umgebungsvariablen laden (WICHTIG: Ganz am Anfang!) ──────────────────
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Fallback, falls im falschen Verzeichnis gestartet
if (!process.env.DATABASE_URL) {
    dotenv.config();
}

// Sicherheitscheck: Ohne Datenbank-URL kann der Server nicht laufen.
if (!process.env.DATABASE_URL) {
    console.error('❌ KRITISCHER FEHLER: DATABASE_URL nicht gefunden!');
    console.error('   Bitte stelle sicher, dass die Datei "backend/.env" existiert und die URL enthält.');
    console.error(`   Gesucht in: ${envPath}`);
    process.exit(1); // Beenden, da der Server sonst nutzlos ist.
} else {
    console.log('✅ Umgebungsvariablen geladen.');
}

// ─── 2. Alle weiteren Module importieren ──────────────────────────────────────
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { Permission } from '@prisma/client';
import prisma from './lib/prisma'; // Importiert den korrekten Singleton-Client

import authRouter from './routes/auth';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import toolsRouter from './routes/tools';
import hostedRouter from './routes/hosted';
import settingsRouter from './routes/settings';
import { loginRateLimiter } from './middleware/rateLimiter';

// ─── 3. Express App initialisieren ──────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Sicherheits-Middlewares ──────────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
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
    'http://localhost:5173',     // Vite Standard
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://192.168.2.110:3000', // Netzwerk IP
    'http://192.168.2.110',
    'http://it-portal.jona-s.com',
    'https://it-portal.jona-s.com',
    process.env.FRONTEND_URL
].filter((origin): origin is string => !!origin);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log(`⚠️ CORS blockiert Anfrage von: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Standard-Middlewares ────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ─── Upload-Verzeichnis sicherstellen ────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Routen-Setup ────────────────────────────────────────────────────────────
app.use('/hosted', hostedRouter);

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate Limiter für den Login-Endpunkt
app.use('/api/auth/login', loginRateLimiter);

// API-Routen
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/settings', settingsRouter);

// ─── Fehlerbehandlung ────────────────────────────────────────────────────────
app.use((req, res) => {
    console.warn(`⚠️ 404 - Route nicht gefunden: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route nicht gefunden', path: req.url });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ error: 'Interner Serverfehler' });
});

// ─── Initialisierung beim Start ─────────────────────────────────────────────
async function ensureAdminUser() {
    try {
        const adminRole = await prisma.role.upsert({
            where: { name: 'Admin' },
            update: {},
            create: {
                name: 'Admin',
                description: 'System Administrator',
                permissions: { create: Object.values(Permission).map(p => ({ permission: p })) }
            }
        });

        await prisma.user.upsert({
            where: { username: 'admin' },
            update: {
                isAdmin: true,
                isActive: true,
                roleId: adminRole.id,
            },
            create: {
                username: 'admin',
                email: 'admin@itportal.local',
                passwordHash: await bcrypt.hash('mpipwmkbe3521!', 12),
                isAdmin: true,
                isActive: true,
                roleId: adminRole.id,
                requirePasswordChange: false
            }
        });
        console.log('✅ Admin-Benutzer sichergestellt.');

    } catch (error) {
        console.error('⚠️ Konnte Admin-User nicht verifizieren (Datenbank-Fehler?):', error);
    }
}

async function ensureSystemSettings() {
    try {
        const SETTINGS_ID = 'system-settings';
        const existing = await prisma.setting.findUnique({ where: { id: SETTINGS_ID } });
        if (!existing) {
            await prisma.setting.create({
                data: {
                    id: SETTINGS_ID,
                    appName: 'IT Portal',
                    subtitle: 'Schul-IT Management',
                    loginTitle: 'Willkommen zurück',
                    loginSubtitle: 'Bitte melde dich an, um fortzufahren',
                    primaryColor: '#3b82f6',
                    secondaryColor: '#1e40af',
                    accentColor: '#60a5fa',
                    fontFamily: 'Inter'
                }
            });
            console.log('✅ Standard-Systemeinstellungen erstellt.');
        }
    } catch (error) {
        console.error('⚠️ Konnte Systemeinstellungen nicht sicherstellen:', error);
    }
}

// ─── Server starten ──────────────────────────────────────────────────────────
async function initialize() {
    await ensureAdminUser();
    await ensureSystemSettings();
}

initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 IT Portal Backend läuft auf http://localhost:${PORT}`);
        console.log(`📁 Upload-Verzeichnis: ${uploadDir}`);
    });
});

export default app;
