import React from 'react';

export interface DiscoveryNotesProps {
  data?: {
    intent: string[];
    reqs: string[];
    constraints: string[];
  };
}

export const DiscoveryNotes: React.FC<DiscoveryNotesProps> = ({ data }) => {
  // Inicializa com arrays vazios se data for undefined
  const safeData = data || { intent: [], reqs: [], constraints: [] };

  const renderList = (items: string[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="text-xs text-[#9fb0d3] italic opacity-50 py-1">{emptyText}</p>;
    }
    return (
      <ul className="list-disc list-inside text-sm text-[#e6ecff] space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  return (
    <div className="bg-[#141b2b] border border-[#24304a] rounded-lg p-4 h-full overflow-y-auto">
      <h3 className="font-semibold text-[#e6ecff] mb-4 flex items-center gap-2">
        <span>🧭</span> Discovery Notes
      </h3>
      
      <div className="space-y-4">
        {/* Intenção */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#4ba3ff] uppercase tracking-wider mb-2">Intenção</h4>
          {renderList(safeData.intent, "O que você quer construir?")}
        </div>

        {/* Requisitos */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#47e6a1] uppercase tracking-wider mb-2">Requisitos</h4>
          {renderList(safeData.reqs, "O que o sistema deve ter? (Use 'deve', 'precisa')")}
        </div>

        {/* Restrições */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#ff5c7a] uppercase tracking-wider mb-2">Restrições</h4>
          {renderList(safeData.constraints, "O que é proibido? (Use 'não pode', 'sem')")}
        </div>
      </div>
    </div>
  );
};
