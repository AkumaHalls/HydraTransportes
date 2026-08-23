#!/bin/bash
# Hydra Transportes Urgentes - Script de inicialização

cd "$(dirname "$0")/backend"

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências..."
  npm install
fi

echo "Iniciando Hydra Transportes Urgentes..."
exec node server.js
