#!/usr/bin/env bash
set -e

echo "🚑 [Phase 14] Resolvendo colisão de nomes no Analysis Agent..."

AGENT_INDEX="packages/analysis-agent/src/index.ts"

# ==============================================================================
# 1. Reescrever index.ts (Limpeza Total)
# Removemos a classe antiga e deixamos apenas os exports limpos
# ==============================================================================
echo "📝 Reescrevendo $AGENT_INDEX..."

cat > "$AGENT_INDEX" <<EOF
// Exporta o Agente Real (Inteligência)
export { AnalysisAgent, type AgentConfig } from './agent';

// Exporta o Serviço de Consolidação (Arquivos)
export { ConsolidatorService } from './services/consolidator-service';

// Re-exporta tipos do shared se necessário (opcional, mas boa prática)
// export * from '@mini-ide/shared';
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🏗️  Compilando Agent..."
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Colisão resolvida. O Agente agora aponta para a implementação real."
