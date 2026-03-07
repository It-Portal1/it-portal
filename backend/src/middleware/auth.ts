/**
 * Auth Middleware
 * Verifiziert JWT Access-Token aus Authorization-Header oder Cookie
 */
import { Request, Response, NextFunction } from 'express';
import { Permission } from '@prisma/client';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';

// Erweitere den Express Request-Typ um den User-Payload
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware: Prüft ob der Benutzer eingeloggt ist (Pflicht)
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({ error: 'Nicht authentifiziert' });
            return;
        }

        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token' });
    }
}

/**
 * Middleware: Prüft optional ob der Benutzer eingeloggt ist
 * Setzt req.user falls gültiges Token vorhanden, bricht aber bei Fehlern nicht ab.
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = extractToken(req);
        if (token) {
            const payload = verifyAccessToken(token);
            req.user = payload;
        }
    } catch {
        // Fehler beim Token-Verifizieren einfach ignorieren
    }
    next();
}

/**
 * Hilfsfunktion zum Extrahieren des Tokens
 */
function extractToken(req: Request): string | undefined {
    // Token aus Authorization-Header extrahieren
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Alternativ aus Cookie (httpOnly)
    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    return undefined;
}

/**
 * Middleware-Factory: Prüft ob der Benutzer eine bestimmte Berechtigung hat
 */
export function requirePermission(...permissions: Permission[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Nicht authentifiziert' });
            return;
        }

        // Admin hat immer Zugriff
        if (req.user.isAdmin) {
            next();
            return;
        }

        // Prüfe ob der User ALLE geforderten Berechtigungen hat
        const hasAll = permissions.every(p => req.user!.permissions.includes(p));
        if (!hasAll) {
            res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
            return;
        }

        next();
    };
}

/**
 * Middleware: Nur Admins dürfen diese Route aufrufen
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ error: 'Nicht authentifiziert' });
        return;
    }

    if (!req.user.isAdmin) {
        res.status(403).json({ error: 'Administratorrechte erforderlich' });
        return;
    }

    next();
}
