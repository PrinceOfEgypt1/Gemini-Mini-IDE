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
    // Helper para limpar prefixos redundantes gerados pela IA
    const cleanPrefix = (text: string | undefined, prefix: string): string => {
      if (!text) return "Não especificado";
      // Remove "Como", "Quero", "Para" (case insensitive) do início
      const regex = new RegExp(`^${prefix}\\s+`, 'i');
      return text.replace(regex, '').trim();
    };

    const rawText = story.description || story.story || "";
    
    const extractSection = (keywords: string[]): string | null => {
      const pattern = keywords.join('|');
      const regex = new RegExp(`(?:##|\\*\\*|\\n)\\s*(?:${pattern})[:\\s]*([\\s\\S]*?)(?=(?:##|\\*\\*|\\n[A-Z][a-z]+:|$))`, 'i');
      const match = rawText.match(regex);
      return match ? match[1].trim() : null;
    };

    const textToList = (text: string | null): string[] => {
      if (!text) return [];
      return text.split(/\n/).map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(l => l.length > 0);
    };

    // Tenta usar os campos estruturados primeiro, limpando os prefixos
    let role = cleanPrefix(story.role, "Como");
    const action = cleanPrefix(story.action, "Quero");
    const benefit = cleanPrefix(story.benefit, "Para");

    // Fallback para extração de texto bruto se os campos estruturados falharem
    if (role === "Não especificado" && rawText) {
       const match = rawText.match(/Como\s+([^,.]+)/i);
       if (match) role = match[1].trim();
    }

    return {
      role,
      action,
      benefit,
      context: story.context || extractSection(['Contexto', 'Business Context']),
      rf: (story.functionalReqs?.length ?? 0) > 0 ? story.functionalReqs : textToList(extractSection(['Requisitos Funcionais'])),
      rnf: (story.nonFunctionalReqs?.length ?? 0) > 0 ? story.nonFunctionalReqs : textToList(extractSection(['Requisitos Não Funcionais'])),
      security: (story.security?.length ?? 0) > 0 ? story.security : textToList(extractSection(['Segurança'])),
      criteria: (story.acceptanceCriteria?.length ?? 0) > 0 ? story.acceptanceCriteria : textToList(extractSection(['Critérios']))
    };
  }, [story]);

  return (
    <div className={`bg-[var(--bg-panel)] border rounded-lg transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30' : 'border-[var(--border-main)] hover:border-[var(--text-secondary)]'}`}>
      
      <div className="p-4 cursor-pointer bg-gradient-to-r from-[var(--bg-panel)] to-[var(--bg-app)]" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded border border-[var(--brand-primary)]/20">{story.id}</span>
            {story.priority && <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded">{story.priority}</span>}
          </div>
          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">{isExpanded ? '▼' : '▶'}</button>
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
        
        {!isExpanded && <div className="mt-3 text-xs text-[var(--text-muted)] flex justify-end">Clique para ver detalhes</div>}
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--border-main)] bg-[var(--bg-app)]/50 p-4 space-y-6 text-sm">
          {structuredData.context && (
            <section>
              <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Contexto</h4>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{structuredData.context}</p>
            </section>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Critérios de Aceite</h4>
                <ul className="space-y-2">{structuredData.criteria?.map((c, i) => <li key={i} className="flex gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--success)] flex-shrink-0"/><span>{c}</span></li>)}</ul>
             </section>
             <section>
                <h4 className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 tracking-widest border-b border-[var(--border-main)] pb-1">Segurança</h4>
                <ul className="space-y-1">{structuredData.security?.map((s, i) => <li key={i} className="text-[var(--text-secondary)] flex gap-2"><span className="opacity-70">🛡️</span>{s}</li>)}</ul>
             </section>
          </div>
        </div>
      )}
    </div>
  );
};
