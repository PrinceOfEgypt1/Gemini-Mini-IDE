import React from 'react';
import { UserStory, UserStoryCard } from './UserStoryCard';

interface HUsPanelProps {
  stories?: UserStory[];
}

export const HUsPanel: React.FC<HUsPanelProps> = ({ stories = [] }) => {
  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <p>Nenhuma história de usuário gerada ainda.</p>
        <p className="text-xs mt-2">Peça ao agente para criar um projeto.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      {stories.map((story) => (
        <UserStoryCard key={story.id} story={story} />
      ))}
    </div>
  );
};
