#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TOKEN_METER_PATH="packages/ui/src/components/common/TokenMeter.tsx"

log_info "Atualizando escala do TokenMeter para 128k (High Context)..."

# Reescreve o componente com o novo limite default
cat > "$TOKEN_METER_PATH" << 'EOF'
import React, { useMemo } from 'react';

interface TokenMeterProps {
  chatHistory: Array<{ text: string }>;
  files: Array<{ content: string }>;
  // Atualizado para o hard limit do GPT-4o (128k context window)
  maxTokens?: number;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({ 
  chatHistory, 
  files, 
  maxTokens = 131072 // Limite real da infraestrutura
}) => {
  
  const usage = useMemo(() => {
    // 1. Calcular tamanho do chat
    const chatChars = chatHistory.reduce((acc, msg) => acc + msg.text.length, 0);
    
    // 2. Calcular tamanho dos arquivos (Contexto do projeto)
    const filesChars = files.reduce((acc, file) => acc + (file.content?.length || 0), 0);
    
    const totalChars = chatChars + filesChars;
    
    // Estimativa: 1 Token ~= 3.5 Caracteres (Média segura para código + PT-BR)
    const estimatedTokens = Math.ceil(totalChars / 3.5);
    
    // Garante que a porcentagem não ultrapasse 100% visualmente
    const percentage = Math.min(100, (estimatedTokens / maxTokens) * 100);
    
    return { tokens: estimatedTokens, percentage };
  }, [chatHistory, files, maxTokens]);

  // Definição de cores baseada no uso
  let colorClass = "bg-emerald-500"; // Verde
  let statusText = "Contexto Saudável";
  
  // Ajuste das faixas de alerta para o novo volume
  // Amarelo em 75% (~98k tokens)
  if (usage.percentage > 75) {
    colorClass = "bg-yellow-500"; 
    statusText = "Memória Alta";
  }
  // Vermelho em 95% (~124k tokens)
  if (usage.percentage > 95) {
    colorClass = "bg-red-500 animate-pulse"; 
    statusText = "Limite do Modelo Próximo";
  }

  return (
    <div className="flex flex-col gap-1 w-full px-4 py-2 border-t border-[var(--border-main)] bg-[var(--bg-panel)]">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
        <span>Memória da IA</span>
        <span>{usage.tokens.toLocaleString()} / {maxTokens.toLocaleString()} tk</span>
      </div>
      
      <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden" title={`Uso estimado: ${usage.percentage.toFixed(1)}%`}>
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${usage.percentage}%` }}
        />
      </div>
      
      {usage.percentage > 95 && (
        <div className="text-[10px] text-red-400 mt-1 text-center font-medium">
          ⚠️ Atenção: Você está atingindo o limite físico do modelo de IA.
        </div>
      )}
    </div>
  );
};
EOF
log_ok "TokenMeter atualizado para 131.072 tokens."

# Recompilar UI
log_info "Recompilando UI..."
cd packages/ui
rm -f tsconfig.tsbuildinfo
if ../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build; then
    log_ok "UI compilada com sucesso!"
else
    echo "Erro na compilação da UI."
    exit 1
fi
cd ../..

log_ok "Correção aplicada. Recarregue a página."
