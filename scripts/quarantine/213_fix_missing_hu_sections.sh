#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/213_fix_missing_hu_sections.sh
# Objetivo: Adicionar renderização de RF e RNF no UserStoryCard que estavam faltando
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Adicionando seções de RF e RNF ao visual do UserStoryCard..."

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
    
    // 1. Extração GWT
    const roleMatch = rawText.match(/Como\s+([^,.]+)/i);
    const actionMatch = rawText.match(/Quero\s+([^,.]+)/i);
    const benefitMatch = rawText.match(/Para\s+([^.]+)/i);

    // 2. Helper de Extração de Seção
    const extractSection = (header: string): string | null => {
      // Busca headers como "## Header", "**Header**", "Header:"
      const regex = new RegExp(`(?:##|\\*\\*|\\n)\\s*${header}[:\\s]*([\\s\\S]*?)(?=(?:##|\\*\\*|\\n[A-Z]|$))`, 'i');
      const match = rawText.match(regex);
      return match ? match[1].trim() : null;
    };

    // 3. Helper para transformar texto em lista (quebra por linhas ou bullets)
    const textToList = (text: string | null): string[] => {
      if (!text) return [];
      return text
        .split(/\n/) // Quebra por linha
        .map(line => line.replace(/^[-*•]\s*/, '').trim()) // Remove bullets
        .filter(line => line.length > 0); // Remove linhas vazias
    };

    // Tenta extrair do texto bruto caso não venha estruturado do backend
    const extractedContext = extractSection('Contexto') || extractSection('Contexto de Negócio');
    const extractedRF = textToList(extractSection('Requisitos Funcionais') || extractSection('Funcionalidades'));
    const extractedRNF = textToList(extractSection('Requisitos Não Funcionais') || extractSection('Não Funcionais'));
    const extractedSecurity = textToList(extractSection('Segurança') || extractSection('Segurança & Limites'));

    return {
      role: story.role || (roleMatch ? roleMatch[1].trim() : "usuário"),
      action: story.action || (actionMatch ? actionMatch[1].trim() : "realizar uma ação"),
      benefit: story.benefit || (benefitMatch ? benefitMatch[1].trim() : "obter valor"),
      
      context: story.context || extractedContext,
      
      // Prioriza dados estruturados, fallback para extração
      rf: (story.functionalReqs && story.functionalReqs.length > 0) ? story.functionalReqs : extractedRF,
      rnf: (story.nonFunctionalReqs && story.nonFunctionalReqs.length > 0) ? story.nonFunctionalReqs : extractedRNF,
      security: (story.security && story.security.length > 0) ? story.security : extractedSecurity
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

             {/* 3. Requisitos Funcionais (RF) - AGORA VISÍVEL */}
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

             {/* 4. Requisitos Não Funcionais (RNF) - AGORA VISÍVEL */}
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

echo "✅ UserStoryCard atualizado: Agora exibe RF, RNF e Contexto corretamente."
EOF
