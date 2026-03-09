/**
 * Prisma Client Initialisierung
 * 
 * Dieser Code stellt sicher, dass die Datenbank-URL aus der .env-Datei geladen wird,
 * BEVOR der Prisma Client initialisiert wird. Dies ist die robusteste Methode,
 * um Verbindungsprobleme zu vermeiden.
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Lade die .env Datei aus dem 'backend' Verzeichnis (zwei Ebenen über /src/lib)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error('❌ KRITISCHER FEHLER: DATABASE_URL in der .env-Datei (im backend-Ordner) nicht gefunden oder leer.');
}

// Wir übergeben die URL explizit, um sicherzustellen, dass sie immer korrekt verwendet wird.
const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

export default prisma;