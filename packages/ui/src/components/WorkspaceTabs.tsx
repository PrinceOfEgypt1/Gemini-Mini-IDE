import React from 'react';
import clsx from 'clsx';
import { ExploreTimeline, TimelineEvent } from './explore/ExploreTimeline';

export type TabId = 'overview' | 'hus' | 'docs' | 'tests' | 'plan' | 'timeline' | 'runs' | 'metrics' | 'outputs' | 'analyze';

interface WorkspaceTabsProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  events: TimelineEvent[];
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, setActiveTab, events }) => {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Testes' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'plan', label: 'Personas' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'runs', label: 'Runs' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <section className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx('pill', { ok: activeTab === tab.id })}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}
            aria-label={`Aba ${tab.label}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 8, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'overview' && (
          <div style={{ padding: 10 }}>
            <h2>Bem-vindo à Mini IDE</h2>
            <p className="muted">Modo de Exploração Ativo.</p>
            <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 8, marginTop: 20 }}>
              Selecione uma aba ou use o chat para começar.
            </div>
          </div>
        )}
        {activeTab === 'timeline' && (
          <ExploreTimeline events={events} />
        )}
        {!['overview', 'timeline'].includes(activeTab) && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
            <p>Conteúdo da aba <strong>{activeTab}</strong> será implementado em breve.</p>
          </div>
        )}
      </div>
    </section>
  );
};
