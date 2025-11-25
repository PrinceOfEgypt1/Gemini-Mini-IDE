#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/206_refine_hus_parser.sh
# Objetivo: Tornar o parser de HUs resiliente a quebras de linha e pontuação
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Refinando parser de HUs para máxima robustez..."

cat << 'EOF' > packages/ui/src/components/hus/UserStoryCard.tsx
import React, { useMemo } from 'react';

export interface UserStory {
  id: string;
  role?: string;
  action?: string;
  benefit?: string;
  description?: string;
  story?: string; // Campo comum retornado pela IA
  acceptanceCriteria: string[];
}

interface UserStoryCardProps {
  story: UserStory;
}

export const UserStoryCard: React.FC<UserStoryCardProps> = ({ story }) => {
  const parsedContent = useMemo(() => {
    // 1. Se o backend já mandou separado (estruturado), prioridade total
    if (story.role && story.action && story.benefit) {
      return { 
        role: story.role, 
        action: story.action, 
        benefit: story.benefit 
      };
    }

    // 2. Normaliza o texto (remove quebras de linha malucas e espaços extras)
    const rawText = (story.description || story.story || "").replace(/[\n\r]+/g, ' ').trim();
    
    // 3. Extração Independente (Mais robusta)
    // Procura "Como [algo]" até encontrar "Quero" ou fim da frase
    const roleMatch = rawText.match(/Como\s+(.+?)(?=\s*[,.]?\s*Quero)/i);
    
    // Procura "Quero [algo]" até encontrar "Para" ou fim da frase
    const actionMatch = rawText.match(/Quero\s+(.+?)(?=\s*[,.]?\s*Para)/i);
    
    // Procura "Para [algo]" até o fim
    const benefitMatch = rawText.match(/Para\s+(.+?)(?=$|[.])/i);

    return {
      role: roleMatch ? roleMatch[1].trim() : "usuário",
      action: actionMatch ? actionMatch[1].trim() : (rawText || "Ação não identificada"),
      benefit: benefitMatch ? benefitMatch[1].trim() : "atingir o objetivo"
    };
  }, [story]);

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-4 hover:border-[var(--brand-primary)] transition-colors shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-mono font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded border border-[var(--brand-primary)]/20">
          {story.id}
        </span>
      </div>
      
      <div className="mb-4 text-sm text-[var(--text-primary)] flex-grow">
        {/* Renderização defensiva: Se falhar tudo, não quebra o layout */}
        <div className="space-y-2">
          <div className="leading-snug">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">Como</span>
            <span className="text-[var(--text-primary)]">{parsedContent.role}</span>
          </div>
          <div className="leading-snug">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">Quero</span>
            <span className="text-[var(--text-primary)]">{parsedContent.action}</span>
          </div>
          <div className="leading-snug">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5">Para</span>
            <span className="text-[var(--text-primary)]">{parsedContent.benefit}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--border-main)] mt-auto">
        <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest">Critérios de Aceite</h4>
        <ul className="space-y-1.5">
          {story.acceptanceCriteria.map((criteria, idx) => (
            <li key={idx} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
              <span className="text-[var(--success)] mt-0.5 flex-shrink-0">✓</span>
              <span className="leading-tight">{criteria}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
EOF

echo "✅ UserStoryCard refinado com regex independente."
EOF
