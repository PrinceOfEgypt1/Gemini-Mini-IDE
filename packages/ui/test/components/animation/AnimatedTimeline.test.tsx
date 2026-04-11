import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, onClick, ...rest }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} className={className} onClick={onClick} {...rest}>{children}</div>
    )),
  },
}));

import { AnimatedTimeline, type TimelineEvent } from '../../../src/components/animation/AnimatedTimeline';

const sampleEvents: TimelineEvent[] = [
  { id: 'evt-1', title: 'Analise iniciada', description: 'Processando dados do usuario', timestamp: Date.now() - 60000, icon: '🔍' },
  { id: 'evt-2', title: 'Projeto gerado', description: 'Codigo pronto para review', timestamp: Date.now() },
  { id: 'evt-3', title: 'Evento sem icone', description: 'Descricao simples', timestamp: Date.now() + 1000 },
];

describe('AnimatedTimeline', () => {
  it('renders all events', () => {
    render(<AnimatedTimeline events={sampleEvents} />);
    expect(screen.getByText('Analise iniciada')).toBeDefined();
    expect(screen.getByText('Projeto gerado')).toBeDefined();
    expect(screen.getByText('Evento sem icone')).toBeDefined();
  });

  it('renders event descriptions', () => {
    render(<AnimatedTimeline events={sampleEvents} />);
    expect(screen.getByText('Processando dados do usuario')).toBeDefined();
    expect(screen.getByText('Codigo pronto para review')).toBeDefined();
  });

  it('renders event icons when provided', () => {
    render(<AnimatedTimeline events={sampleEvents} />);
    expect(screen.getByText('🔍')).toBeDefined();
  });

  it('renders formatted timestamps', () => {
    render(<AnimatedTimeline events={sampleEvents} />);
    // Timestamps are rendered via toLocaleString('pt-BR')
    const timeElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onEventClick when an event dot is clicked', () => {
    const onEventClick = vi.fn();
    render(<AnimatedTimeline events={sampleEvents} onEventClick={onEventClick} />);

    // Click on a dot - the dots are inside timeline items
    // Each event has two clickable areas (dot and content card)
    // Let's click on the content area which has the title
    const contentCard = screen.getByText('Analise iniciada').closest('[class]');
    if (contentCard) {
      fireEvent.click(contentCard);
    }
    expect(onEventClick).toHaveBeenCalledWith(sampleEvents[0]);
  });

  it('renders empty list when no events', () => {
    const { container } = render(<AnimatedTimeline events={[]} />);
    expect(container.textContent).toBe('');
  });

  it('handles event selection with visual feedback', () => {
    render(<AnimatedTimeline events={sampleEvents} />);

    // Click first event content
    const firstContent = screen.getByText('Analise iniciada').closest('[class]');
    if (firstContent) {
      fireEvent.click(firstContent);
    }

    // Click second event content
    const secondContent = screen.getByText('Projeto gerado').closest('[class]');
    if (secondContent) {
      fireEvent.click(secondContent);
    }

    // Both should be rendered (no crash)
    expect(screen.getByText('Analise iniciada')).toBeDefined();
    expect(screen.getByText('Projeto gerado')).toBeDefined();
  });
});
