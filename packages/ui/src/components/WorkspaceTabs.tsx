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
    { id: 'tests', label: 'Testes' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#24304a]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === tab.id
              ? 'bg-[#4ba3ff] text-white'
              : 'bg-[#222b40] text-[#9fb0d3] hover:text-white border border-[#24304a]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
