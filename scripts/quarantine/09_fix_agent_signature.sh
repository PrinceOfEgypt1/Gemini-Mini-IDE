#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Ajustando assinatura do analyze() para compatibilidade com o Server..."

# Substitui a definição do método analyze para aceitar um segundo argumento opcional (ignorando-o com _)
# De: public async analyze(userPrompt: string): Promise<AgentResult>
# Para: public async analyze(userPrompt: string, _options?: unknown): Promise<AgentResult>

sed -i 's/public async analyze(userPrompt: string): Promise<AgentResult>/public async analyze(userPrompt: string, _options?: unknown): Promise<AgentResult>/' packages/analysis-agent/src/agent.ts

echo "[SUCCESS] Assinatura corrigida. O Server agora conseguirá chamar o Agente."
