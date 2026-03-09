#!/bin/bash
# ==============================================================================
# IT Portal - Automated Ubuntu CT Setup Script
# ==============================================================================
# Dieses Script automatisiert die komplette Installation des IT Portals.
# Führe es als root oder mit sudo aus: bash setup-ct.sh
# ==============================================================================

set -e

# --- KONFIGURATION (Hier anpassen) ---
DOMAIN="it-portal.jona-s.com"
DB_NAME="itportal"
DB_USER="postgres"
DB_PASS="password"
REPO_URL="https://github.com/It-Portal1/it-portal.git"
PROJECT_DIR="/var/www/it-portal"

echo "🚀 Starte IT Portal Setup auf Ubuntu CT..."

# 1. System Update
echo "📦 [1/7] System-Update und Abhängigkeiten..."
apt update && apt upgrade -y
apt install -y curl git postgresql postgresql-contrib nginx

# 2. Node.js (v20) & PM2
echo "🟢 [2/7] Node.js und PM2 installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. PostgreSQL Datenbank Setup
echo "🐘 [3/7] Datenbank initialisieren..."
# Datenbank und User erstellen
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -c "ALTER DATABASE $DB_NAME OWNER TO $DB_USER;"

# 4. Repository klonen
echo "📥 [4/7] Projekt von GitHub klonen..."
mkdir -p /var/www
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️ Verzeichnis existiert bereits, lösche altes Verzeichnis..."
    rm -rf "$PROJECT_DIR"
fi
git clone "$REPO_URL" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 5. Konfiguration (.env Dateien)
echo "⚙️ [5/7] Umgebungsvariablen konfigurieren..."

# Backend .env
cat > backend/.env << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME?schema=public"
PORT=5000
JWT_ACCESS_SECRET="gen-$(date +%s | sha256sum | base64 | head -c 32)"
JWT_REFRESH_SECRET="gen-$(date +%s | sha256sum | base64 | head -c 32)"
FRONTEND_URL="https://$DOMAIN"
NODE_ENV="production"
EOF

# Frontend .env.local
cat > frontend/.env.local << EOF
# In Produktion nutzen wir den relativen Pfad /api, da alles über denselben Nginx läuft
NEXT_PUBLIC_API_URL="/api"
EOF

# 6. Build & Start
echo "🏗️ [6/7] Backend und Frontend bauen..."

# Backend
cd backend
npm install
npx prisma db push
npm run seed
npm run build
pm2 start dist/server.js --name "it-portal-backend"

# Frontend
cd ../frontend
npm install
npm run build
pm2 start npm --name "it-portal-frontend" -- run start

# PM2 Autostart
pm2 save
pm2 startup | tail -n 1 | bash || true
pm2 save

# 7. Nginx Reverse Proxy
echo "🌐 [7/7] Nginx konfigurieren..."
# Sicherstellen, dass Services beim Booten starten
systemctl enable postgresql
systemctl enable nginx

NGINX_CONF="/etc/nginx/sites-available/it-portal"
cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }

    location /hosted/ {
        proxy_pass http://localhost:5000/hosted/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo "=========================================================================="
echo "🎉 SETUP ABGESCHLOSSEN!"
echo "📍 Domain: http://$DOMAIN"
echo "👤 Admin: admin / mpipwmkbe3521!"
echo "=========================================================================="
echo "HINWEIS: Installiere Cloudflare Tunnel mit 'cloudflared' falls noch nicht geschehen."
