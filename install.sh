#!/bin/bash
# ==============================================================================
# IT Portal - Ultimate One-Click Ubuntu Installer
# ==============================================================================
# Dieses Script installiert Node.js, PM2, Nginx, PostgreSQL und Cloudflared.
# Es richtet das gesamte Portal automatisch ein.
# Führe es als root aus: bash install.sh
# ==============================================================================

set -e

# --- KONFIGURATION (Hier anpassen) ---
DOMAIN="it-portal.deine-domain.com"
DB_NAME="itportal"
DB_USER="postgres"
DB_PASS="password"
REPO_URL="https://github.com/It-Portal1/it-portal.git"
PROJECT_DIR="/var/www/it-portal"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starte IT Portal Ultimate Installation...${NC}"

# 1. System Update & Dependencies
echo -e "${GREEN}[1/7] System-Update und Abhängigkeiten...${NC}"
apt update && apt upgrade -y
apt install -y curl git nginx

# 2. Node.js (v20) & PM2
echo -e "${GREEN}[2/7] Node.js und PM2 installieren...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. Datenbank Setup (SQLite)
echo -e "${GREEN}[3/7] Datenbank vorbereiten...${NC}"
# SQLite benötigt keine separate Installation oder User-Setup

# 4. Repository klonen & Config
echo -e "${GREEN}[4/7] Projekt von GitHub abrufen und konfigurieren...${NC}"
mkdir -p "$PROJECT_DIR"
if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    git pull
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# Backend .env
cat > backend/.env << EOF
DATABASE_URL="file:./dev.db"
PORT=5000
JWT_ACCESS_SECRET="gen-$(date +%s | sha256sum | head -c 32)"
JWT_REFRESH_SECRET="gen-$(date +%s | sha256sum | head -c 32)"
FRONTEND_URL="http://$DOMAIN"
NODE_ENV="production"
EOF

# Frontend .env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL="/api"
EOF

# 5. Build & Start (PM2)
echo -e "${GREEN}[5/7] Backend und Frontend bauen...${NC}"
cd backend && npm install && npx prisma db push --accept-data-loss && npm run seed && npm run build
pm2 delete it-backend || true
pm2 start dist/server.js --name "it-backend"

cd ../frontend && npm install && npm run build
pm2 delete it-frontend || true
pm2 start npm --name "it-frontend" -- run start
pm2 save
pm2 startup | tail -n 1 | bash || true

# 6. Nginx Reverse Proxy
echo -e "${GREEN}[6/7] Nginx konfigurieren...${NC}"
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
        client_max_body_size 50M;
    }

    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo -e "\n${BLUE}==========================================================================${NC}"
echo -e "🎉 INSTALLATION ABGESCHLOSSEN!"
echo -e "📍 URL: http://$DOMAIN (Lokal)"
echo -e "👤 Login: admin / mpipwmkbe3521!"
echo -e "\nDu kannst das Portal jetzt über Nginx oder einen eigenen Tunnel aufrufen."
echo -e "${BLUE}==========================================================================${NC}"
