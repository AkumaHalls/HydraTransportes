#!/bin/bash
# BlueMeter Web - Script de instalação para Oracle Linux

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  BlueMeter Web - Instalação"
echo "========================================"

if ! command -v node &> /dev/null; then
  echo "[1/4] Instalando Node.js..."
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  dnf install -y nodejs
else
  echo "[1/4] Node.js já instalado: $(node -v)"
fi

echo "[2/4] Instalando dependências do backend..."
cd "$DIR/backend"
npm install

echo "[3/4] Configurando firewall..."
if command -v firewall-cmd &> /dev/null; then
  firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
fi

echo "[4/4] Criando serviço systemd..."
cat > /etc/systemd/system/bluemeter.service << SERVICE
[Unit]
Description=BlueMeter Web
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$DIR
ExecStart=$(which node) $DIR/backend/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable bluemeter
systemctl start bluemeter

echo ""
echo "========================================"
echo "  Instalação concluída!"
echo "  Acesse: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo "========================================"
