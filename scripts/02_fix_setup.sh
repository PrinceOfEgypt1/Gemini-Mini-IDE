#!/usr/bin/env bash
set -e

echo "🔧 Corrigindo configurações da Sprint 1..."

# 1. Adicionar scripts ao package.json da raiz
# Isso permite rodar 'pnpm lint' na raiz e ele disparar para todos os pacotes (-r)
echo "📝 Atualizando package.json da raiz..."
tmp=$(mktemp)
jq '.scripts = {
  "lint": "pnpm -r lint",
  "test": "pnpm -r test",
  "typecheck": "pnpm -r typecheck",
  "build": "pnpm -r build",
  "dev": "pnpm --filter @mini-ide/ui dev",
  "start": "pnpm --filter @mini-ide/server start"
}' package.json > "$tmp" && mv "$tmp" package.json

# 2. Normalizar localização do Pipeline Checklist
# A governança define que ele deve ficar na raiz
if [ -f "scripts/42_pipeline_checklist.sh" ]; then
    echo "🚚 Movendo checklist de volta para a raiz (padrão de governança)..."
    mv scripts/42_pipeline_checklist.sh ./42_pipeline_checklist.sh
    rmdir scripts 2>/dev/null || true
fi

# 3. Atualizar o conteúdo do Checklist para ser mais robusto
# Garante que ele chame os scripts recém-criados no package.json
echo "🛡️ Atualizando script do checklist..."
cat > 42_pipeline_checklist.sh <<'EOF'
#!/usr/bin/env bash
set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=============================================="
echo "🛡️  MINI-IDE PIPELINE CHECKLIST (Local Gate)"
echo "=============================================="

run_step() {
    echo -e "\n[Step] $1..."
    if $2; then
        echo -e "${GREEN}✔ Sucesso${NC}"
    else
        echo -e "${RED}❌ Falha ao executar: $1${NC}"
        exit 1
    fi
}

# Agora chamamos os scripts do package.json raiz que já têm o flag -r (recursivo)
run_step "🧹 Linting (ESLint)" "pnpm lint"
run_step "🔍 Type Checking (TSC)" "pnpm typecheck"
run_step "🧪 Unit Tests (Vitest)" "pnpm test"
run_step "🏗️  Building (TSC/Vite)" "pnpm build"

echo "=============================================="
echo -e "${GREEN}✅  PIPELINE VERDE! Pronto para commit.${NC}"
echo "=============================================="
EOF

chmod +x 42_pipeline_checklist.sh

echo "✅ Correção aplicada!"
echo "👉 Agora execute: ./42_pipeline_checklist.sh"
