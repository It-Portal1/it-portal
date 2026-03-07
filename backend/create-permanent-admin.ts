import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const username = 'admin';
    const password = 'mpipwmkbe3521!';

    console.log(`Konfiguriere permanenten Benutzer '${username}'...`);

    // Passwort sicher hashen
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        // Upsert: Erstellt den User wenn er nicht existiert, oder aktualisiert ihn wenn er existiert
        const user = await prisma.user.upsert({
            where: { username },
            update: {
                passwordHash: hashedPassword,
                isAdmin: true,
                isActive: true,
                requirePasswordChange: false, // Verhindert, dass das Passwort geändert werden muss
            },
            create: {
                username,
                email: 'admin@it-portal.local', // Dummy-Email, da meistens required
                passwordHash: hashedPassword,
                isAdmin: true,
                isActive: true,
                requirePasswordChange: false,
            },
        });

        console.log(`✅ Benutzer '${user.username}' ist eingerichtet.`);
        console.log(`🔑 Passwort ist gesetzt auf: ${password}`);
    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Benutzers:', error);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });