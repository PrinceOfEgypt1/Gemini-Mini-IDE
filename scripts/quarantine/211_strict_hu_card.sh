#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/211_strict_hu_card.sh
# Objetivo: Refatorar UserStoryCard para seguir rigorosamente o padrão do PDF
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "💎 Elevando padrão do UserStoryCard para conformidade total..."

cat << 'EOF' > packages/ui/src/components/hus/UserStoryCard.tsx
import React, { useState, useMemo } from 'react';

// Interface completa baseada no Padrão de Excelência do PDF
export interface UserStory {
  id: string;
  title?: string; // Pode ser inferido da ação
  role?: string;
  action?: string;
  benefit?: string;
  
  // Campos de texto rico
  context?: string;
  functionalReqs?: string[];
  nonFunctionalReqs?: string[];
  security?: string[];
  
  // Fallback para texto bruto
  description?: string;
  story?: string;
  
  acceptanceCriteria: string[];
  priority?: string;
}

interface UserStoryCardProps {
  story: UserStory;
}

export const UserStoryCard: React.FC<UserStoryCardProps> = ({ story }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parser avançado para extrair estrutura do texto bruto se necessário
  const structuredData = useMemo(() => {
    const rawText = story.description || story.story || "";
    
    // 1. Extração básica do GWT (Como/Quero/Para)
    // Melhorado para não capturar lixo antes ou depois
    const roleMatch = rawText.match(/Como\s+([^,.]+)/i);
    const actionMatch = rawText.match(/Quero\s+([^,.]+)/i);
    const benefitMatch = rawText.match(/Para\s+([^.]+)/i);

    // 2. Tentar extrair seções se estiverem no texto (Markdown style)
    // Isso permite que o card funcione mesmo se o backend mandar tudo num blocão de texto
    const extractSection = (header: string) => {
      const regex = new RegExp(\`(?:\#\#|\*\*)\s*${header}[\s\S]*?(?=(?:\#\#|\*\*|$))\`, 'i');
      const match = rawText.match(regex);
      return match ? match[0].replace(new RegExp(\`(?:\#\#|\*\*)\s*${header}\`, 'i'), '').trim() : null;
    };

    return {
      role: story.role || (roleMatch ? roleMatch[1].trim() : "usuário"),
      action: story.action || (actionMatch ? actionMatch[1].trim() : "realizar uma ação"),
      benefit: story.benefit || (benefitMatch ? benefitMatch[1].trim() : "obter valor"),
      // Se o backend mandar estruturado, usa. Senão, tenta extrair. Senão, undefined.
      context: story.context || extractSection('Contexto') || extractSection('Contexto de Negócio'),
      rf: story.functionalReqs || [], // Idealmente viria estruturado
      rnf: story.nonFunctionalReqs || [],
      security: story.security || []
    };
  }, [story]);

  return (
    <div className={`bg-[var(--bg-panel)] border rounded-lg transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30' : 'border-[var(--border-main)] hover:border-[var(--text-secondary)]'}`}>
      
      {/* --- CABEÇALHO (Sempre visível) --- */}
      <div 
        className="p-4 cursor-pointer bg-gradient-to-r from-[var(--bg-panel)] to-[var(--bg-app)]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded border border-[var(--brand-primary)]/20">
              {story.id}
            </span>
            {story.priority && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded">
                {story.priority}
              </span>
            )}
          </div>
          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Formato Padrão: Como / Quero / Para */}
        <div className="space-y-1.5 text-sm text-[var(--text-primary)]">
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">Como</span>
            <span className="font-medium">{structuredData.role}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">Quero</span>
            <span className="font-semibold leading-snug">{structuredData.action}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">Para</span>
            <span className="italic text-[var(--text-secondary)]">{structuredData.benefit}</span>
          </div>
        </div>
        
        {!isExpanded && (
           <div className="mt-3 text-xs text-[var(--text-muted)] flex justify-end">
             Clique para ver detalhes completos
           </div>
        )}
      </div>

      {/* --- CORPO DETALHADO (Expandable) --- */}
      {isExpanded && (
        <div className="border-t border-[var(--border-main)] bg-[var(--bg-app)]/50 p-4 space-y-6 text-sm">
          
          {/* Contexto de Negócio */}
          {(structuredData.context) && (
            <section>
              <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 border-b border-[var(--border-main)] pb-1">Contexto de Negócio</h4>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {structuredData.context}
              </p>
            </section>
          )}

          {/* Requisitos Funcionais & Não Funcionais (Placeholders se não vierem estruturados) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <section>
                <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 border-b border-[var(--border-main)] pb-1">Critérios de Aceite (GWT)</h4>
                <ul className="space-y-2">
                  {story.acceptanceCriteria.map((criteria, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[var(--text-primary)]">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--success)] flex-shrink-0" />
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
             </section>

             {/* Seção de Segurança e Limites (Exibida se houver dados ou como placeholder educativo) */}
             <section>
                <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 border-b border-[var(--border-main)] pb-1">Segurança & Limites</h4>
                {structuredData.security.length > 0 ? (
                   <ul className="list-disc pl-4 text-[var(--text-secondary)]">
                     {structuredData.security.map((s, i) => <li key={i}>{s}</li>)}
                   </ul>
                ) : (
                   <p className="text-[var(--text-muted)] italic text-xs">
                     Nenhum requisito de segurança específico listado explicitamente nesta HU.
                   </p>
                )}
             </section>
          </div>
        </div>
      )}
    </div>
  );
};
EOF

echo "✅ UserStoryCard refatorado para padrão estrito do PDF."
EOF
