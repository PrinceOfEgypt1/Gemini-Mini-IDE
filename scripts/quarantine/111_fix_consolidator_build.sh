#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Corrigindo tipos do UUID e Linter do Consolidator..."

# ==============================================================================
# 1. Instalar Tipos do UUID
# Resolve o erro TS7016
# ==============================================================================
echo "📦 Instalando @types/uuid no analysis-agent..."
# Usamos pnpm add para garantir que o lockfile seja atualizado corretamente
pnpm --filter @mini-ide/analysis-agent add -D @types/uuid

# ==============================================================================
# 2. Corrigir Warning do Linter (no-console)
# O uso de console.error é legítimo aqui para logar falhas de parse do Zod.
# ==============================================================================
echo "📝 Ajustando regra de lint no ConsolidatorService..."
TARGET_FILE="packages/analysis-agent/src/services/consolidator-service.ts"

# Verifica se o arquivo existe
if [ -f "$TARGET_FILE" ]; then
    # Insere o comentário de disable antes da linha do console.error
    # Usa sed para substituir 'console.error' por '// eslint-disable-next-line no-console\n      console.error'
    # O espaçamento é para manter a indentação
    sed -i 's/console.error/ \/\/ eslint-disable-next-line no-console\n      console.error/' "$TARGET_FILE"
    echo "✅ Regra de lint ajustada."
else
    echo "⚠️  Arquivo $TARGET_FILE não encontrado."
fi

# ==============================================================================
# 3. Validação Completa
# ==============================================================================
echo "🛡️  Validando correções..."

echo "   > Lint (Deve estar limpo)..."
pnpm --filter @mini-ide/analysis-agent lint

echo "   > Testes (Forçando execução do novo teste)..."
# Forçamos o vitest a rodar explicitamente o arquivo novo para garantir que ele não seja ignorado
pnpm --filter @mini-ide/analysis-agent test src/services/consolidator-service.test.ts

echo "   > Build (Deve passar agora)..."
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Hotfix aplicado. A Fase 11.1 (Core) está funcional."
