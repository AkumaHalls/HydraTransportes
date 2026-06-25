#!/bin/bash
# BlueMeter Web - Script de inicialização

cd "$(dirname "$0")/backend"

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm install
fi

echo "Iniciando BlueMeter Web..."
exec node server.js
