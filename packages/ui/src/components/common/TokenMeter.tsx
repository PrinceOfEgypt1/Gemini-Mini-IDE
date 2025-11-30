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
  let statusText = "Memória Saudável";
  
  if (usage.percentage > 75) {
    colorClass = "bg-yellow-500"; 
    statusText = "Memória Alta";
  }
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
      
      {/* FIX: statusText agora é usado no title para acessibilidade/tooltip */}
      <div 
        className="h-1.5 w-full bg-[var(--bg-panel-hover)] rounded-full overflow-hidden" 
        title={`${statusText} (${usage.percentage.toFixed(1)}%)`}
      >
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${usage.percentage}%` }}
        />
      </div>
      
      {usage.percentage > 95 && (
        <div className="text-[10px] text-red-400 mt-1 text-center font-medium">
          ⚠️ {statusText}
        </div>
      )}
    </div>
  );
};
