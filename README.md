npm# IT Portal

Ein modernes, sicheres Portal für Schul-IT-Teams zur Verwaltung von Tools und Benutzern.

## 🚀 Schnellstart

### 1. Voraussetzungen
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (für PostgreSQL)

### 2. Datenbank starten
Führe im Hauptverzeichnis aus:
```bash
docker-compose up -d
```

### 3. Backend einrichten
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Das Backend läuft nun auf [http://localhost:5000](http://localhost:5000).

### 4. Frontend einrichten
In einem neuen Terminal:
```bash
cd frontend
npm install
npm run dev
```
Das Frontend läuft nun auf [http://localhost:3000](http://localhost:3000).

## 🔐 Login-Daten (Standard)
- **Benutzername:** `admin`
- **Passwort:** `mpipwmkbe3521!`

## 🛠️ Funktionen
- **Modernes UI** mit Dark/Light Mode
- **Rollen- & Rechtesystem** (Admin, IT-Team, User)
- **Tool-Kacheln**: Externe Links oder gehostete HTML-Dateien
- **HTML-Hosting**: Sicheres Hosting von hochgeladenen HTML-Dateien mit Sanitization
- **Admin-Panel**: Umfassende Verwaltung von Usern, Rollen und Tools
- **Sicherheit**: JWT Auth, bcrypt Hashing, Rate Limiting, CORS, Helmet
