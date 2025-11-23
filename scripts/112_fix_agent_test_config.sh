#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Corrigindo configuração de Testes e Tipos do Agent..."

AGENT_DIR="packages/analysis-agent"

# ==============================================================================
# 1. Criar vitest.config.ts explícito
# Resolve: "No test files found" em subdiretórios
# ==============================================================================
echo "📝 Criando $AGENT_DIR/vitest.config.ts..."
cat > $AGENT_DIR/vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Busca recursiva em todas as subpastas
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    environment: 'node',
    globals: true
  }
});
EOF

# ==============================================================================
# 2. Forçar @types/uuid no package.json
# Resolve: TS7016 (garante que a dependência existe no manifesto)
# ==============================================================================
echo "📦 Garantindo @types/uuid no package.json..."

# Usamos node para editar o JSON de forma segura e cirúrgica
node -e "
const fs = require('fs');
const pkgPath = '$AGENT_DIR/package.json';
const pkg = require('./' + pkgPath);

pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@types/uuid'] = '^9.0.8'; // Versão estável compatível

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
"

# ==============================================================================
# 3. Reinstalação Limpa e Rápida
# Garante que o PNPM linke os tipos corretamente
# ==============================================================================
echo "🔄 Atualizando lockfile e links..."
pnpm install --no-frozen-lockfile

# ==============================================================================
# 4. Verificação de Arquivo (Sanity Check)
# ==============================================================================
TARGET_TEST="$AGENT_DIR/src/services/consolidator-service.test.ts"
if [ -f "$TARGET_TEST" ]; then
    echo "✅ Arquivo de teste encontrado em disco: $TARGET_TEST"
else
    echo "❌ ERRO CRÍTICO: O arquivo de teste não existe! O script 110 falhou silenciosamente?"
    ls -R $AGENT_DIR/src
    exit 1
fi

# ==============================================================================
# 5. Validação Final
# ==============================================================================
echo "🛡️  Validando correções..."

echo "   > Testes (Deve encontrar 2 arquivos agora)..."
pnpm --filter @mini-ide/analysis-agent test

echo "   > Build (Deve passar sem erro de UUID)..."
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Fase 11.1 Estabilizada."
