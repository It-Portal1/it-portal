#!/bin/bash
# IT Portal - Ubuntu Installation Script
# Dieses Script installiert Node.js, PM2, Nginx und richtet das Projekt ein.
# Führe dieses Script mit SUDO-Rechten aus!

set -e

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starte IT Portal Installation...${NC}"

# 1. System updaten
echo -e "${GREEN}[1/8] System aktualisieren...${NC}"
sudo apt update && sudo apt upgrade -y

# 2. Node.js und Nginx installieren
echo -e "${GREEN}[2/8] Abhängigkeiten installieren (Node.js, Nginx, MySQL-Client)...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git mysql-client

# 3. PM2 Prozessmanager installieren
echo -e "${GREEN}[3/8] PM2 installieren...${NC}"
sudo npm install -g pm2

# 4. Repository Setup
echo -e "${GREEN}[4/8] Projektverzeichnis einrichten...${NC}"
# Ersetze die URL mit deinem echten GitHub Repository Link!
REPO_URL="https://github.com/It-Portal1/it-portal.git"
PROJECT_DIR="/var/www/it-portal"

if [ -d "$PROJECT_DIR" ]; then
    echo "Verzeichnis existiert bereits. Überspringe Klonen."
else
    sudo git clone $REPO_URL $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
fi

cd $PROJECT_DIR

# 5. Backend einrichten
echo -e "${GREEN}[5/8] Backend konfigurieren...${NC}"
cd $PROJECT_DIR/backend
npm install
npm run build
# PM2 für Backend starten
pm2 start dist/server.js --name "it-portal-backend"

# 6. Frontend einrichten
echo -e "${GREEN}[6/8] Frontend konfigurieren...${NC}"
cd $PROJECT_DIR/frontend
npm install
npm run build
# PM2 für Frontend starten (Next.js)
pm2 start npm --name "it-portal-frontend" -- run start

# 7. PM2 Autostart konfigurieren
echo -e "${GREEN}[7/8] PM2 Autostart nach Server-Reboot einrichten...${NC}"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# 8. Nginx Reverse Proxy Einrichtung
echo -e "${GREEN}[8/8] Nginx konfigurieren...${NC}"
NGINX_CONF="/etc/nginx/sites-available/it-portal"
sudo bash -c "cat > $NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name DEINE_DOMAIN_ODER_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API + Hosted Tools (Uploads)
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Erlaube Uploads bis max. 50MB (oder mehr, z.b. 100M)
        client_max_body_size 50M;
    }

    location /hosted/ {
        proxy_pass http://localhost:5000/hosted/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/it-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}Installation abgeschlossen!${NC}"
echo -e "Wichtige nächste Schritte manuell:"
echo -e "1. Erstelle die Datei ${PROJECT_DIR}/backend/.env mit deinen MySQL Verbindungsdaten."
echo -e "2. Führe im Backend-Ordner 'npx prisma db push' aus, um die Datenbank zu erstellen."
echo -e "3. Führe im Backend-Ordner 'npm run seed' aus, um den Admin-User zu erstellen."
echo -e "4. Ersetze in /etc/nginx/sites-available/it-portal den Eintrag 'DEINE_DOMAIN_ODER_IP' mit deiner echten IP oder Domain."
echo -e "5. Starte Nginx neu mit 'sudo systemctl restart nginx'"
echo -e "${GREEN}==============================================${NC}"
