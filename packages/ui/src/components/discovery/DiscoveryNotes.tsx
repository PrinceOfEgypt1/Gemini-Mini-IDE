import React from 'react';

export const DiscoveryNotes: React.FC = () => {
  return (
    <aside className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <strong>Discovery Notes</strong>
      </div>
      <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
         <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 8 }}>
           <small style={{ color: 'var(--brand)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
             Intenção
           </small>
           <div style={{ marginTop: 4, fontSize: '13px' }}>Criar aplicação React</div>
         </div>
         <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 8, opacity: 0.5 }}>
           <small style={{ color: 'var(--muted)', fontSize: '10px' }}>REQUISITOS</small>
           <div style={{ marginTop: 4, fontSize: '13px', fontStyle: 'italic' }}>Nenhum requisito capturado...</div>
         </div>
      </div>
    </aside>
  );
};
