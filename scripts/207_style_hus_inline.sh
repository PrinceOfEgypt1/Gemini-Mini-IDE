#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/207_style_hus_inline.sh
# Objetivo: Ajustar layout dos cards de HU para formato inline (COMO usuário...)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🎨 Refinando estilo dos cartões de HU para layout inline..."

cat << 'EOF' > packages/ui/src/components/hus/UserStoryCard.tsx
import React, { useMemo } from 'react';

export interface UserStory {
  id: string;
  role?: string;
  action?: string;
  benefit?: string;
  description?: string;
  story?: string;
  acceptanceCriteria: string[];
}

interface UserStoryCardProps {
  story: UserStory;
}

export const UserStoryCard: React.FC<UserStoryCardProps> = ({ story }) => {
  const parsedContent = useMemo(() => {
    // 1. Prioridade para dados estruturados
    if (story.role && story.action && story.benefit) {
      return { 
        role: story.role, 
        action: story.action, 
        benefit: story.benefit 
      };
    }

    // 2. Normaliza texto
    const rawText = (story.description || story.story || "").replace(/[\n\r]+/g, ' ').trim();
    
    // 3. Regex independente (Resiliente)
    const roleMatch = rawText.match(/Como\s+(.+?)(?=\s*[,.]?\s*Quero)/i);
    const actionMatch = rawText.match(/Quero\s+(.+?)(?=\s*[,.]?\s*Para)/i);
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
        <div className="space-y-2">
          {/* Layout Inline: Flexbox ou apenas spans na mesma linha */}
          <div className="leading-relaxed">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1.5">COMO</span>
            <span className="text-[var(--text-primary)]">{parsedContent.role}</span>
          </div>
          <div className="leading-relaxed">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1.5">QUERO</span>
            <span className="text-[var(--text-primary)]">{parsedContent.action}</span>
          </div>
          <div className="leading-relaxed">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mr-1.5">PARA</span>
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

echo "✅ Estilo UserStoryCard atualizado (Layout Inline)."
EOF
