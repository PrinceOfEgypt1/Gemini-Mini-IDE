import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExploreTimeline, TimelineEvent } from '../../src/components/explore/ExploreTimeline';

describe('ExploreTimeline', () => {
  it('renderiza mensagem de vazio quando não há eventos', () => {
    render(<ExploreTimeline events={[]} />);
    expect(screen.getByText(/Nenhum evento registrado/i)).toBeDefined();
  });

  it('renderiza lista de eventos quando fornecidos', () => {
    const mockEvents: TimelineEvent[] = [
      {
        id: '1',
        type: 'system',
        category: 'system',
        title: 'Sistema Iniciado',
        description: 'Teste de timeline',
        timestamp: new Date()
      }
    ];

    render(<ExploreTimeline events={mockEvents} />);
    expect(screen.getByText('Sistema Iniciado')).toBeDefined();
    expect(screen.getByText('Teste de timeline')).toBeDefined();
  });
});
