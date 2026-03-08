#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Iniciando Sincronização FINAL de Módulos..."

# 1. CORRIGIR O ERRO DE PROPRIEDADE EXTRA NO AGENT.TS
# ==============================================================================
# O erro TS2561 diz que 'architecture' não existe no tipo RichAgentResult (o correto é 'architect')
# Vamos remover a linha duplicada que está causando o erro.
echo "[INFO] Corrigindo propriedade duplicada em agent.ts..."
sed -i '/architecture: architecture,/d' packages/analysis-agent/src/agent.ts


# 2. REESCREVER O ÍNDICE DE TIPOS (packages/analysis-agent/src/types/index.ts)
# ==============================================================================
# Garante que ele exporte tudo do rich-schemas.ts e nada mais.
echo "[INFO] Regenerando packages/analysis-agent/src/types/index.ts..."
cat > packages/analysis-agent/src/types/index.ts << 'EOF'
export * from "./rich-schemas.js";
EOF


# 3. REESCREVER O ÍNDICE DE GOVERNANÇA (packages/analysis-agent/src/governance/index.ts)
# ==============================================================================
# Garante que ele exporte as 3 classes que criamos e nada de "globalCompletenessValidator" antigo.
echo "[INFO] Regenerando packages/analysis-agent/src/governance/index.ts..."
cat > packages/analysis-agent/src/governance/index.ts << 'EOF'
export * from "./completeness-validator.js";
export * from "./structure-auditor.js";
export * from "./syntax-sandbox.js";
EOF


# 4. REESCREVER O ÍNDICE PRINCIPAL (packages/analysis-agent/src/index.ts)
# ==============================================================================
# Este é o arquivo que estava quebrando com erros de "Module has no exported member".
# Vamos limpá-lo para exportar apenas o Agente e os Tipos fundamentais.
echo "[INFO] Regenerando packages/analysis-agent/src/index.ts..."
cat > packages/analysis-agent/src/index.ts << 'EOF'
import { AnalysisAgent } from "./agent.js";
import { AgentResult } from "./types/rich-schemas.js";

// Exporta a classe principal
export { AnalysisAgent };

// Exporta tipos essenciais para quem consome o pacote (CLI/Server)
export * from "./types/index.js";
export * from "./governance/index.js";

// Exporta helpers se necessário
export const createAgent = (apiKey: string) => new AnalysisAgent(apiKey);
EOF

echo "[SUCCESS] Todos os índices foram sincronizados. O build deve passar agora."
