/**
 * JWT Hilfsfunktionen
 * Erstellt und verifiziert Access- und Refresh-Tokens
 */
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { Permission } from '@prisma/client';

export interface JwtPayload {
    userId: string;
    username: string;
    email: string;
    isAdmin: boolean;
    permissions: Permission[];
}

/**
 * Erstellt ein kurzlebiges Access-Token (15 Minuten)
 */
export function signAccessToken(payload: JwtPayload): string {
    const secret = (process.env.JWT_ACCESS_SECRET as string) || 'default_secret';
    const expiresIn = (process.env.JWT_ACCESS_EXPIRES as string) || '15m';

    return jwt.sign(payload as any, secret, {
        expiresIn: expiresIn as any,
    });
}

/**
 * Erstellt ein langlebiges Refresh-Token (7 Tage) und speichert es in der DB
 */
export async function signRefreshToken(userId: string): Promise<string> {
    const token = uuidv4(); // Zufälliger, nicht-JWT Token als Refresh
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
        data: { token, userId, expiresAt },
    });

    return token;
}

/**
 * Verifiziert ein Access-Token und gibt den Payload zurück
 */
export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;
}

/**
 * Löst ein Refresh-Token gegen ein neues Access+Refresh-Token-Paar auf
 * Implementiert Token-Rotation für mehr Sicherheit
 */
export async function refreshTokens(oldRefreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
        where: { token: oldRefreshToken },
        include: { user: { include: { role: { include: { permissions: true } }, userPermissions: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
        // Abgelaufenes oder ungültiges Token löschen
        if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
        throw new Error('Ungültiges Refresh-Token');
    }

    // Token-Rotation: altes löschen, neues erstellen
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const { user } = stored;
    const permissions = getUserPermissions(user);

    const accessToken = signAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        permissions,
    });
    const refreshToken = await signRefreshToken(user.id);

    return { accessToken, refreshToken };
}

/**
 * Berechnet alle effektiven Berechtigungen eines Benutzers
 * (Rollen-Berechtigungen UNION individuelle Berechtigungen)
 */
export function getUserPermissions(user: {
    isAdmin: boolean;
    role?: { permissions: { permission: Permission }[] } | null;
    userPermissions: { permission: Permission }[];
}): Permission[] {
    if (user.isAdmin) {
        // Admin hat alle Berechtigungen
        return Object.values(Permission);
    }

    const rolePerms = user.role?.permissions.map(p => p.permission) ?? [];
    const individualPerms = user.userPermissions.map(p => p.permission);

    // Vereinigung ohne Duplikate
    return [...new Set([...rolePerms, ...individualPerms])];
}
