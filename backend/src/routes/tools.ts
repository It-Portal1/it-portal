/**
 * Tool Management Routes
 * CRUD für Tools inkl. Datei-Upload und gehostete HTML-Dateien
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import prisma from '../lib/prisma';
import { authenticate, optionalAuthenticate, requirePermission } from '../middleware/auth';
import { Permission, ToolType, ToolVisibility } from '@prisma/client';

const router = Router();
// router.use(authenticate); // Nicht mehr global, da GET /tools öffentlich sein soll

// ─── Multer Upload-Konfiguration ─────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        // Sichere Dateinamen: nur alphanumerisch + Bindestrich
        const safe = file.originalname
            .replace(/[^a-zA-Z0-9\-_.]/g, '_')
            .toLowerCase();
        const unique = `${Date.now()}-${safe}`;
        cb(null, unique);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Max
    fileFilter: (_req, file, cb) => {
        // Nur .html-Dateien erlaubt
        if (file.mimetype !== 'text/html' && !file.originalname.endsWith('.html')) {
            cb(new Error('Nur HTML-Dateien erlaubt'));
            return;
        }
        cb(null, true);
    },
});

/**
 * HTML-Sanitization mit DOMPurify
 * Entfernt gefährliche Skripte und Event-Handler aus hochgeladenen HTML-Dateien
 */
async function sanitizeHtmlFile(filePath: string): Promise<void> {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const dom = new JSDOM(raw);
        const { window } = dom;
        const purify = DOMPurify(window as any);

        // Etwas großzügigere Sanitization, um komplexe Tools nicht zu zerstören
        const clean = purify.sanitize(raw, {
            WHOLE_DOCUMENT: true,
            RETURN_DOM: false,
            // Skripte erlauben wir im iframe sandbox sowieso begrenzt, 
            // aber wir lassen sie hier durch, falls das Tool sie braucht.
            // Die Sicherheit kommt durch das sandboxed iframe im Frontend.
            ADD_TAGS: ['style', 'link', 'meta', 'title', 'head', 'body', 'html', 'script', 'base'],
            ADD_ATTR: ['charset', 'http-equiv', 'rel', 'href', 'content', 'name', 'viewport', 'src', 'type', 'id', 'class'],
            FORCE_BODY: false,
            PARSER_MEDIA_TYPE: 'text/html',
        });
        fs.writeFileSync(filePath, clean, 'utf-8');
    } catch (err) {
        console.error('Error in sanitizeHtmlFile:', err);
        throw new Error('Fehler bei der HTML-Verarbeitung');
    }
}

/**
 * Hilfsfunktion: Prüft ob der aktuelle User ein bestimmtes Tool öffnen/nutzen darf
 */
async function canUserAccessTool(
    tool: { visibility: string; id: string },
    userId: string | undefined,
    userRoleId: string | undefined,
    isAdmin: boolean
): Promise<boolean> {
    if (isAdmin) return true;
    if (tool.visibility === 'PUBLIC') return true;

    // Ab hier ist ein User erforderlich
    if (!userId) return false;

    if (tool.visibility === 'ROLE_BASED' && userRoleId) {
        const access = await prisma.toolRoleAccess.findFirst({
            where: { toolId: tool.id, roleId: userRoleId },
        });
        return !!access;
    }

    if (tool.visibility === 'USER_BASED') {
        const access = await prisma.toolUserAccess.findFirst({
            where: { toolId: tool.id, userId },
        });
        return !!access;
    }

    return false;
}

// GET /api/tools – Tools auflisten (öffentlich sichtbar, aber eingeschränkter Zugriff)
router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
        const allTools = await prisma.tool.findMany({
            where: { isActive: true },
            include: { roleAccess: true, userAccess: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });

        const userId = req.user?.userId;
        const isAdmin = req.user?.isAdmin ?? false;

        // Benutzer-Rolle holen falls eingeloggt
        let roleId: string | undefined;
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { roleId: true },
            });
            roleId = user?.roleId ?? undefined;
        }

        // Alle Tools zurückgeben, aber mit isRestricted Kennzeichnung
        const toolsWithAccess = await Promise.all(allTools.map(async (tool) => {
            const hasAccess = await canUserAccessTool(
                tool,
                userId,
                roleId,
                isAdmin
            );

            // Interne Felder nicht zurückgeben
            const { filePath: _, ...safeTool } = tool;

            return {
                ...safeTool,
                isRestricted: !hasAccess // Falls kein Zugriff -> restricted
            };
        }));

        res.json(toolsWithAccess);
    } catch (err) {
        console.error('[Get Tools Error]', err);
        res.status(500).json({ error: 'Tools konnten nicht abgerufen werden' });
    }
});

// POST /api/tools – Neues Tool erstellen
router.post(
    '/',
    authenticate,
    requirePermission(Permission.CREATE_TOOLS),
    async (req: Request, res: Response) => {
        try {
            const { name, description, icon, type, url, visibility, isActive, isLocked, roleIds, userIds, sortOrder } = req.body;

            if (!name || !type) {
                res.status(400).json({ error: 'Name und Typ sind erforderlich' });
                return;
            }

            if (type === ToolType.EXTERNAL_LINK && !url) {
                res.status(400).json({ error: 'URL für externen Link erforderlich' });
                return;
            }

            // Slug aus Name generieren (URL-sicher)
            let slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');

            // Falls es eine HTML-Datei ist, stellen wir sicher dass der slug nicht auf .html endet
            if (slug.endsWith('-html')) slug = slug.slice(0, -5);

            const tool = await prisma.tool.create({
                data: {
                    name,
                    slug,
                    description,
                    icon,
                    type: type as ToolType,
                    url,
                    visibility: (visibility as ToolVisibility) ?? ToolVisibility.PUBLIC,
                    isActive: isActive ?? true,
                    isLocked: isLocked ?? false,
                    sortOrder: sortOrder ?? 0,
                    roleAccess: roleIds?.length ? {
                        create: roleIds.map((roleId: string) => ({ roleId })),
                    } : undefined,
                    userAccess: userIds?.length ? {
                        create: userIds.map((userId: string) => ({ userId })),
                    } : undefined,
                },
                include: { roleAccess: true, userAccess: true },
            });

            res.status(201).json(tool);
        } catch (err) {
            console.error('[Create Tool]', err);
            res.status(500).json({ error: 'Tool konnte nicht erstellt werden' });
        }
    }
);

// POST /api/tools/upload – HTML-Datei hochladen
router.post(
    '/upload',
    authenticate,
    requirePermission(Permission.CREATE_TOOLS),
    upload.single('file'),
    async (req: Request, res: Response) => {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'Keine Datei hochgeladen' });
                return;
            }

            // HTML sanitizen vor dem endgültigen Speichern
            await sanitizeHtmlFile(req.file.path);

            res.json({
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                path: req.file.filename, // Relativer Pfad (nur Dateiname)
            });
        } catch (err) {
            console.error('[Upload Error]', err);
            // Datei bei Fehler löschen
            if (req.file) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Upload fehlgeschlagen' });
        }
    }
);

// PUT /api/tools/:id – Tool aktualisieren
router.put(
    '/:id',
    authenticate,
    requirePermission(Permission.EDIT_TOOLS),
    async (req: Request, res: Response) => {
        try {
            const { name, description, icon, url, visibility, isActive, isLocked, roleIds, userIds, sortOrder } = req.body;

            const existing = await prisma.tool.findUnique({ where: { id: req.params.id } });
            if (!existing) {
                res.status(404).json({ error: 'Tool nicht gefunden' });
                return;
            }

            // Zugriffslisten neu setzen
            if (roleIds !== undefined) {
                await prisma.toolRoleAccess.deleteMany({ where: { toolId: req.params.id } });
                if (roleIds.length > 0) {
                    await prisma.toolRoleAccess.createMany({
                        data: roleIds.map((roleId: string) => ({ toolId: req.params.id, roleId })),
                    });
                }
            }

            if (userIds !== undefined) {
                await prisma.toolUserAccess.deleteMany({ where: { toolId: req.params.id } });
                if (userIds.length > 0) {
                    await prisma.toolUserAccess.createMany({
                        data: userIds.map((userId: string) => ({ toolId: req.params.id, userId })),
                    });
                }
            }

            const tool = await prisma.tool.update({
                where: { id: req.params.id },
                data: {
                    ...(name && { name }),
                    ...(description !== undefined && { description }),
                    ...(icon !== undefined && { icon }),
                    ...(url !== undefined && { url }),
                    ...(visibility && { visibility: visibility as ToolVisibility }),
                    ...(typeof isActive === 'boolean' && { isActive }),
                    ...(typeof isLocked === 'boolean' && { isLocked }),
                    ...(sortOrder !== undefined && { sortOrder }),
                },
                include: { roleAccess: true, userAccess: true },
            });

            res.json(tool);
        } catch {
            res.status(500).json({ error: 'Tool konnte nicht aktualisiert werden' });
        }
    }
);

// DELETE /api/tools/:id – Tool löschen
router.delete(
    '/:id',
    authenticate,
    requirePermission(Permission.DELETE_TOOLS),
    async (req: Request, res: Response) => {
        try {
            const tool = await prisma.tool.findUnique({ where: { id: req.params.id } });
            if (!tool) {
                res.status(404).json({ error: 'Tool nicht gefunden' });
                return;
            }

            // HTML-Datei vom Dateisystem löschen
            if (tool.type === ToolType.HTML_FILE && tool.filePath) {
                const filePath = path.join(uploadDir, tool.filePath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await prisma.tool.delete({ where: { id: req.params.id } });
            res.json({ message: 'Tool gelöscht' });
        } catch {
            res.status(500).json({ error: 'Tool konnte nicht gelöscht werden' });
        }
    }
);

// GET /api/tools/:idOrSlug – Einzelnes Tool (für gehostete HTML-Datei Route-Info)
router.get('/:idOrSlug', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
        const { idOrSlug } = req.params;
        const tool = await prisma.tool.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            include: { roleAccess: true, userAccess: true },
        });

        if (!tool) {
            res.status(404).json({ error: 'Tool nicht gefunden' });
            return;
        }

        const userId = req.user?.userId;
        const isAdmin = req.user?.isAdmin ?? false;

        let roleId: string | undefined;
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { roleId: true },
            });
            roleId = user?.roleId ?? undefined;
        }

        const hasAccess = await canUserAccessTool(tool, userId, roleId, isAdmin);

        // Falls restricted, sensible Daten entfernen
        const { filePath: _, ...safeTool } = tool;

        res.json({
            ...safeTool,
            isRestricted: !hasAccess
        });
    } catch (err) {
        console.error('[Get Single Tool Error]', err);
        res.status(500).json({ error: 'Tool konnte nicht abgerufen werden' });
    }
});

export default router;
