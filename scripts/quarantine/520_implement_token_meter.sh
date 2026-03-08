#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TOKEN_METER_PATH="packages/ui/src/components/common/TokenMeter.tsx"
APP_FILE="packages/ui/src/App.tsx"

log_info "Implementando Monitoramento de Contexto (Token Meter)..."

# 1. Criar componente TokenMeter
# Usamos uma estimativa heurística: 1 token ~= 4 caracteres (para código/inglês) ou 3 caracteres (pt-br)
# Vamos ser conservadores: 1 token = 3.5 chars
mkdir -p $(dirname "$TOKEN_METER_PATH")

cat > "$TOKEN_METER_PATH" << 'EOF'
import React, { useMemo } from 'react';

interface TokenMeterProps {
  chatHistory: Array<{ text: string }>;
  files: Array<{ content: string }>;
  maxTokens?: number;
}

export const TokenMeter: React.FC<TokenMeterProps> = ({ 
  chatHistory, 
  files, 
  maxTokens = 30000 // Limite Soft de segurança
}) => {
  
  const usage = useMemo(() => {
    // 1. Calcular tamanho do chat
    const chatChars = chatHistory.reduce((acc, msg) => acc + msg.text.length, 0);
    
    // 2. Calcular tamanho dos arquivos (Contexto do projeto)
    const filesChars = files.reduce((acc, file) => acc + (file.content?.length || 0), 0);
    
    const totalChars = chatChars + filesChars;
    
    // Estimativa: 1 Token ~= 3.5 Caracteres (Média segura para código + PT-BR)
    const estimatedTokens = Math.ceil(totalChars / 3.5);
    const percentage = Math.min(100, (estimatedTokens / maxTokens) * 100);
    
    return { tokens: estimatedTokens, percentage };
  }, [chatHistory, files, maxTokens]);

  // Definição de cores baseada no uso
  let colorClass = "bg-emerald-500"; // Verde (Seguro)
  let statusText = "Memória Saudável";
  
  if (usage.percentage > 75) {
    colorClass = "bg-yellow-500"; // Amarelo (Atenção)
    statusText = "Memória Enchendo";
  }
  if (usage.percentage > 90) {
    colorClass = "bg-red-500 animate-pulse"; // Vermelho (Crítico)
    statusText = "Memória Crítica - Exporte ou Reinicie";
  }

  return (
    <div className="flex flex-col gap-1 w-full px-4 py-2 border-t border-[var(--border-main)] bg-[var(--bg-panel)]">
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
        <span>Contexto da IA</span>
        <span>{usage.tokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens</span>
      </div>
      
      <div className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${usage.percentage}%` }}
        />
      </div>
      
      {usage.percentage > 90 && (
        <div className="text-[10px] text-red-400 mt-1 text-center">
          ⚠️ O contexto está quase cheio. O Agente pode esquecer detalhes antigos.
          Considere exportar o projeto e iniciar um novo chat.
        </div>
      )}
    </div>
  );
};
EOF
log_ok "Componente TokenMeter criado."

# 2. Integrar no Layout do App.tsx
# Vamos injetar o TokenMeter na Sidebar da direita (abaixo do chat ou acima do input)
log_info "Injetando TokenMeter no App.tsx..."

# Como o arquivo é grande, vamos usar uma estratégia de substituição segura
# Importar o componente
sed -i "s|import { Button } from './components/common/Button';|import { Button } from './components/common/Button';\nimport { TokenMeter } from './components/common/TokenMeter';|" "$APP_FILE"

# Inserir o componente antes do footer (Input)
# Procuramos a tag <footer e inserimos o TokenMeter antes dela
# Mas como o TokenMeter precisa estar dentro da aside ou main, vamos colocar no final da aside do chat

# Localizar o fechamento da aside do chat e injetar antes
perl -i -0777 -pe 's/(<aside className="w-96.*?<\/aside>)/<aside className="w-96 flex-none flex flex-col m-3 ml-0 bg-\[var(--bg-panel)\] border border-\[var(--border-main)\] rounded-xl shadow-sm overflow-hidden">\n          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">\n            {chatHistory.map((msg, idx) => (\n              <div key={idx} className={`p-3 rounded-lg border text-sm \${msg.role === "agent" ? "bg-\[var(--bg-panel)\] border-\[var(--border-main)\]" : "bg-\[var(--bg-panel-hover)\] border-\[var(--brand-primary)\]\/30"}`}>\n                <strong className={`block text-xs mb-1 \${msg.role === "agent" ? "text-\[var(--brand-primary)\]" : "text-\[var(--success)\]"}`}>{msg.role === "agent" ? "Agente" : "Você"}<\/strong>\n                <div className="whitespace-pre-wrap">{msg.text}<\/div>\n              <\/div>\n            ))}\n            {isAnalyzing && <div className="text-xs text-\[var(--text-muted)\] animate-pulse">Processando...<\/div>}\n          <\/div>\n          <TokenMeter chatHistory={chatHistory} files={generatedProject?.engine?.files || []} \/>\n        <\/aside>/s' "$APP_FILE"

log_ok "App.tsx atualizado com monitoramento."

# Recompilar UI
log_info "Recompilando UI..."
cd packages/ui
../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build
cd ../..

log_ok "Pronto. Recarregue a página para ver o Medidor de Contexto."
