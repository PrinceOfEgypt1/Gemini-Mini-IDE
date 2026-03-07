#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/214_fix_hu_redundancy.sh
# Objetivo: Remover redundância onde a justificativa (PARA) vaza para a ação (QUERO)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "✂️ Aplicando correção de redundância nas HUs..."

cat << 'EOF' > packages/ui/src/components/hus/UserStoryCard.tsx
import React, { useState, useMemo } from 'react';

export interface UserStory {
  id: string;
  role?: string;
  action?: string;
  benefit?: string;
  context?: string;
  functionalReqs?: string[];
  nonFunctionalReqs?: string[];
  security?: string[];
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

  const structuredData = useMemo(() => {
    const rawText = story.description || story.story || "";
    
    // 1. Helper de extração de Seção (Markdown Headers)
    const extractSection = (header: string): string | null => {
      const regex = new RegExp(\`(?:##|\\*\\*|\\n)\\s*${header}[:\\s]*([\\s\\S]*?)(?=(?:##|\\*\\*|\\n[A-Z]|$))\`, 'i');
      const match = rawText.match(regex);
      return match ? match[1].trim() : null;
    };

    const textToList = (text: string | null): string[] => {
      if (!text) return [];
      return text
        .split(/\n/)
        .map(line => line.replace(/^[-*•]\s*/, '').trim())
        .filter(line => line.length > 0);
    };

    // 2. Lógica Refinada de GWT (Given-When-Then / Como-Quero-Para)
    
    // Encontra o "Para" (Benefit) primeiro, pois é o final da frase
    // Busca o último "Para" que inicia uma oração de benefício
    const benefitMatch = rawText.match(/Para\s+(.+?)(?=$|[.])/i);
    const rawBenefit = story.benefit || (benefitMatch ? benefitMatch[1].trim() : "atingir o objetivo");

    // Encontra o "Como" (Role)
    const roleMatch = rawText.match(/Como\s+([^,.]+)/i);
    const rawRole = story.role || (roleMatch ? roleMatch[1].trim() : "usuário");

    // Encontra a "Ação" (Quero)
    let rawAction = story.action;
    if (!rawAction) {
      // Tenta capturar tudo entre "Quero" e "Para"
      const actionMatch = rawText.match(/Quero\s+(.+?)(?=\s*[,.]?\s*Para)/i);
      rawAction = actionMatch ? actionMatch[1].trim() : (rawText || "Ação não identificada");
    }

    // --- CORREÇÃO DE REDUNDÂNCIA ---
    // Se a ação contiver a palavra "para" seguida de texto longo, provavelmente vazou o benefício.
    // Cortamos na palavra " para " se ela aparecer.
    const cleanAction = rawAction
      .replace(/\s+para\s+que\s+.*$/i, '') // Remove " para que..."
      .replace(/\s+para\s+o\s+objetivo.*$/i, '') // Remove " para o objetivo..."
      .replace(/\s+para\s+poder\s+.*$/i, '') // Remove " para poder..."
      .trim();

    return {
      role: rawRole,
      action: cleanAction,
      benefit: rawBenefit,
      
      context: story.context || extractSection('Contexto') || extractSection('Contexto de Negócio'),
      rf: (story.functionalReqs && story.functionalReqs.length > 0) ? story.functionalReqs : textToList(extractSection('Requisitos Funcionais') || extractSection('Funcionalidades')),
      rnf: (story.nonFunctionalReqs && story.nonFunctionalReqs.length > 0) ? story.nonFunctionalReqs : textToList(extractSection('Requisitos Não Funcionais') || extractSection('Não Funcionais')),
      security: (story.security && story.security.length > 0) ? story.security : textToList(extractSection('Segurança') || extractSection('Segurança & Limites'))
    };
  }, [story]);

  return (
    <div className={`bg-[var(--bg-panel)] border rounded-lg transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30' : 'border-[var(--border-main)] hover:border-[var(--text-secondary)]'}`}>
      
      {/* --- CABEÇALHO --- */}
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

        <div className="space-y-1.5 text-sm text-[var(--text-primary)]">
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">COMO</span>
            <span className="font-medium">{structuredData.role}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">QUERO</span>
            <span className="font-semibold leading-snug">{structuredData.action}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-12 pt-0.5 text-right flex-shrink-0">PARA</span>
            <span className="italic text-[var(--text-secondary)]">{structuredData.benefit}</span>
          </div>
        </div>
        
        {!isExpanded && (
           <div className="mt-3 text-xs text-[var(--text-muted)] flex justify-end">
             Clique para ver detalhes
           </div>
        )}
      </div>

      {/* --- CORPO DETALHADO --- */}
      {isExpanded && (
        <div className="border-t border-[var(--border-main)] bg-[var(--bg-app)]/50 p-4 space-y-6 text-sm">
          
          {/* 1. Contexto de Negócio */}
          {structuredData.context && (
            <section>
              <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Contexto de Negócio</h4>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {structuredData.context}
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* 2. Critérios de Aceite */}
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Critérios de Aceite</h4>
                <ul className="space-y-2">
                  {story.acceptanceCriteria.map((criteria, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[var(--text-primary)]">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--success)] flex-shrink-0" />
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
             </section>

             {/* 3. Requisitos Funcionais */}
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Requisitos Funcionais</h4>
                {structuredData.rf.length > 0 ? (
                   <ul className="space-y-1">
                     {structuredData.rf.map((item, i) => (
                       <li key={i} className="text-[var(--text-secondary)] flex items-start gap-2">
                         <span className="text-[var(--brand-primary)] opacity-70">•</span>
                         {item}
                       </li>
                     ))}
                   </ul>
                ) : <p className="text-[var(--text-muted)] italic text-xs">Não especificados explicitamente.</p>}
             </section>

             {/* 4. Requisitos Não Funcionais */}
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Requisitos Não Funcionais</h4>
                {structuredData.rnf.length > 0 ? (
                   <ul className="space-y-1">
                     {structuredData.rnf.map((item, i) => (
                       <li key={i} className="text-[var(--text-secondary)] flex items-start gap-2">
                         <span className="text-[var(--brand-primary)] opacity-70">•</span>
                         {item}
                       </li>
                     ))}
                   </ul>
                ) : <p className="text-[var(--text-muted)] italic text-xs">Não especificados explicitamente.</p>}
             </section>

             {/* 5. Segurança */}
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Segurança & Limites</h4>
                {structuredData.security.length > 0 ? (
                   <ul className="space-y-1">
                     {structuredData.security.map((s, i) => (
                       <li key={i} className="text-[var(--text-secondary)] flex items-start gap-2">
                         <span className="text-[var(--brand-primary)] opacity-70">🛡️</span>
                         {s}
                       </li>
                     ))}
                   </ul>
                ) : (
                   <p className="text-[var(--text-muted)] italic text-xs">
                     Nenhum requisito de segurança listado.
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

echo "✅ Correção de redundância aplicada (QUERO x PARA)."
EOF
