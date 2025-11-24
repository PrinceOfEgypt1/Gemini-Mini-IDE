import React from 'react';

export interface DiscoveryNotesProps {
  data?: {
    intent: string[];
    reqs: string[];
    constraints: string[];
  };
}

export const DiscoveryNotes: React.FC<DiscoveryNotesProps> = ({ data }) => {
  const safeData = data || { intent: [], reqs: [], constraints: [] };

  const renderList = (items: string[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="text-xs text-[var(--text-muted)] italic opacity-50 py-1">{emptyText}</p>;
    }
    return (
      <ul className="list-disc list-inside text-sm text-[var(--text-primary)] space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-4 h-full overflow-y-auto transition-colors duration-300">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <span>🧭</span> Discovery Notes
      </h3>
      
      <div className="space-y-4">
        {/* Intenção */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-2">Intenção</h4>
          {renderList(safeData.intent, "O que você quer construir?")}
        </div>

        {/* Requisitos */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--success)] uppercase tracking-wider mb-2">Requisitos</h4>
          {renderList(safeData.reqs, "O que o sistema deve ter? (Use 'deve', 'precisa')")}
        </div>

        {/* Restrições */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider mb-2">Restrições</h4>
          {renderList(safeData.constraints, "O que é proibido? (Use 'não pode', 'sem')")}
        </div>
      </div>
    </div>
  );
};
