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

vi.mock('../../../src/config/animations', () => ({
  TRANSITIONS: { fast: { duration: 0.1 }, normal: { duration: 0.2 } },
  hoverLift: { y: -4 },
}));

import { AnimatedCard } from '../../../src/components/common/AnimatedCard';

describe('AnimatedCard', () => {
  it('renders children content', () => {
    render(<AnimatedCard>Card Content</AnimatedCard>);
    expect(screen.getByText('Card Content')).toBeDefined();
  });

  it('applies default variant styles', () => {
    const { container } = render(<AnimatedCard>Default</AnimatedCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-[var(--bg-panel)]');
  });

  it('applies elevated variant styles', () => {
    const { container } = render(<AnimatedCard variant="elevated">Elevated</AnimatedCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('shadow-lg');
  });

  it('applies outlined variant styles', () => {
    const { container } = render(<AnimatedCard variant="outlined">Outlined</AnimatedCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-transparent');
  });

  it('applies custom className', () => {
    const { container } = render(<AnimatedCard className="custom-class">Custom</AnimatedCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  it('handles onClick', () => {
    const onClick = vi.fn();
    render(<AnimatedCard onClick={onClick}>Clickable</AnimatedCard>);
    fireEvent.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with animated=false', () => {
    const { container } = render(<AnimatedCard animated={false}>Static</AnimatedCard>);
    expect(container.firstChild).toBeDefined();
    expect(screen.getByText('Static')).toBeDefined();
  });

  it('renders with hoverable=false', () => {
    const { container } = render(<AnimatedCard hoverable={false}>No Hover</AnimatedCard>);
    expect(container.firstChild).toBeDefined();
  });
});
