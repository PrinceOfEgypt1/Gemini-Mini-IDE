#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/205_fix_hus_parsing.sh
# Objetivo: Adicionar parser de texto natural ao componente de HUs (Fix HU-UI-Viz-HUs-023)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Aplicando correção no parser de HUs..."

# Sobrescreve UserStoryCard.tsx com lógica de parsing robusta
cat << 'EOF' > packages/ui/src/components/hus/UserStoryCard.tsx
import React, { useMemo } from 'react';

// Interface flexível para aceitar tanto dados estruturados quanto string única
export interface UserStory {
  id: string;
  // Campos opcionais (caso venham separados)
  role?: string;
  action?: string;
  benefit?: string;
  // Campos de texto corrido (o que a IA geralmente manda)
  description?: string;
  story?: string; 
  acceptanceCriteria: string[];
}

interface UserStoryCardProps {
  story: UserStory;
}

export const UserStoryCard: React.FC<UserStoryCardProps> = ({ story }) => {
  // Hook para parsear os dados apenas quando mudarem
  const parsedContent = useMemo(() => {
    // 1. Se já vier separado, usa direto
    if (story.role && story.action && story.benefit) {
      return { role: story.role, action: story.action, benefit: story.benefit };
    }

    // 2. Se não, tenta parsear do texto corrido
    const rawText = story.description || story.story || "";
    
    // Regex para capturar padrões "Como X, Quero Y, Para Z" (case insensitive)
    // Aceita variações de pontuação
    const regex = /Como\s+(.+?)[,.]\s+Quero\s+(.+?)[,.]\s+Para\s+(.+)/i;
    const match = rawText.match(regex);

    if (match) {
      return {
        role: match[1].trim(),
        action: match[2].trim(),
        benefit: match[3].replace(/\.$/, '').trim() // Remove ponto final extra
      };
    }

    // 3. Fallback: se o regex falhar, mostra o texto todo na ação
    return {
      role: "usuário (implícito)",
      action: rawText || "Descrição não disponível",
      benefit: "o objetivo do projeto"
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
        <p className="leading-relaxed">
          <span className="block mb-1">
            <strong className="text-[var(--text-secondary)] uppercase text-xs tracking-wider">Como</strong> {parsedContent.role}
          </span>
          <span className="block mb-1">
            <strong className="text-[var(--text-secondary)] uppercase text-xs tracking-wider">Quero</strong> {parsedContent.action}
          </span>
          <span className="block">
            <strong className="text-[var(--text-secondary)] uppercase text-xs tracking-wider">Para</strong> {parsedContent.benefit}
          </span>
        </p>
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

echo "✅ UserStoryCard atualizado com parser inteligente (Regex)."
EOF
