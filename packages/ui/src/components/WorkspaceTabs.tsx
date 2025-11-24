import React from 'react';

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Tests' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--border-main)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
