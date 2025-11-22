import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceTabs, TabId } from '../../src/components/WorkspaceTabs';
import { TimelineEvent } from '../../src/components/explore/ExploreTimeline';

describe('WorkspaceTabs', () => {
  const mockSetActive = vi.fn();
  const events: TimelineEvent[] = [];

  const renderComponent = (activeTab: TabId = 'overview') => {
    return render(
      <WorkspaceTabs 
        activeTab={activeTab} 
        setActiveTab={mockSetActive} 
        events={events} 
      />
    );
  };

  it('renderiza os botões das abas principais', () => {
    renderComponent();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('HUs')).toBeDefined();
    expect(screen.getByText('Timeline')).toBeDefined();
  });

  it('dispara setActiveTab ao clicar', () => {
    renderComponent();
    const tabDocs = screen.getByText('Docs');
    fireEvent.click(tabDocs);
    expect(mockSetActive).toHaveBeenCalledWith('docs');
  });

  it('exibe o conteúdo da aba Overview por padrão', () => {
    renderComponent('overview');
    expect(screen.getByText(/Bem-vindo à Mini IDE/i)).toBeDefined();
  });
});
