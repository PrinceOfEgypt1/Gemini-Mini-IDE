import React from 'react';

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'code', label: 'Código' }, // Nova aba
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Tests' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-main)] overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap
            ${activeTab === tab.id 
              ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
