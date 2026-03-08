#!/usr/bin/env bash
set -e

echo "🔧 Corrigindo scripts no package.json (UI e Server)..."

# 1. Configurar scripts da UI (Vite)
# -----------------------------------------------------
echo "📝 Atualizando @mini-ide/ui..."
tmp=$(mktemp)
# Lê o package.json atual e adiciona os scripts do Vite
jq '.scripts += {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint . --ext .ts,.tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview"
}' packages/ui/package.json > "$tmp" && mv "$tmp" packages/ui/package.json


# 2. Configurar scripts do Server
# -----------------------------------------------------
echo "📝 Atualizando @mini-ide/server..."
tmp2=$(mktemp)
jq '.scripts += {
  "start": "node dist/index.js",
  "dev": "tsc -b -w" 
}' packages/server/package.json > "$tmp2" && mv "$tmp2" packages/server/package.json

echo "✅ Scripts corrigidos!"
echo "👉 Tente rodar os comandos novamente."
