/**
 * Seed-Skript: Initialer Admin-Benutzer und Standard-Rollen
 * 
 * Ausführen mit: npm run seed
 * Erstellt:
 * - Rollen: Admin, IT-Team, Standard-User
 * - Admin-Benutzer: admin / Admin1234!
 */
import bcrypt from 'bcryptjs';
import { PrismaClient, Permission } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
});

async function main() {
    console.log('🌱 Starte Datenbank-Seed...');

    // ─── Standard-Rollen anlegen ────────────────────────────────────────────────
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Vollständige Systemverwaltung',
            permissions: {
                create: Object.values(Permission).map(p => ({ permission: p }))
            },
        },
    });

    const itRole = await prisma.role.upsert({
        where: { name: 'IT-Team' },
        update: {},
        create: {
            name: 'IT-Team',
            description: 'IT-Mitarbeiter mit erweiterten Rechten',
            permissions: {
                create: [
                    { permission: Permission.VIEW_TOOLS },
                    { permission: Permission.USE_TOOLS },
                    { permission: Permission.CREATE_TOOLS },
                    { permission: Permission.EDIT_TOOLS },
                ]
            },
        },
    });

    const userRole = await prisma.role.upsert({
        where: { name: 'Standard-User' },
        update: {},
        create: {
            name: 'Standard-User',
            description: 'Normaler Benutzer',
            permissions: {
                create: [
                    { permission: Permission.VIEW_TOOLS },
                    { permission: Permission.USE_TOOLS },
                ]
            },
        },
    });

    console.log(`✅ Rollen erstellt: ${adminRole.name}, ${itRole.name}, ${userRole.name}`);

    // ─── Admin-Benutzer anlegen ──────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('mpipwmkbe3521!', 12);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash, // Passwort bei jedem Seed zurücksetzen
            isAdmin: true,
            isActive: true,
            roleId: adminRole.id,
        },
        create: {
            username: 'admin',
            email: 'admin@itportal.local',
            passwordHash,
            isAdmin: true,
            isActive: true,
            roleId: adminRole.id,
            requirePasswordChange: false,
        },
    });
    console.log(`✅ Admin-Benutzer (re)initialisiert: ${admin.username}`);
    console.log('   Passwort: mpipwmkbe3521!');

    // ─── Beispiel-Tool anlegen ───────────────────────────────────────────────────
    await prisma.tool.upsert({
        where: { slug: 'beispiel-link' },
        update: {},
        create: {
            name: 'Beispiel Link',
            slug: 'beispiel-link',
            description: 'Ein Beispiel-Tool mit externem Link',
            icon: 'Globe',
            type: 'EXTERNAL_LINK',
            url: 'https://www.google.com',
            visibility: 'PUBLIC',
            isActive: true,
            isLocked: false,
        },
    });

    console.log('✅ Beispiel-Tool erstellt');
    console.log('\n🎉 Seed erfolgreich abgeschlossen!');
}

main()
    .catch(e => {
        console.error('❌ Seed fehlgeschlagen:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
