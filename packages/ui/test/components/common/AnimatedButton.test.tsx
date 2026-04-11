import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef(({ children, className, disabled, onClick, ...rest }: React.PropsWithChildren<{ className?: string; disabled?: boolean; onClick?: () => void }>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} className={className} disabled={disabled} onClick={onClick} {...rest}>{children}</button>
    )),
    div: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} className={className} {...rest}>{children}</div>
    )),
    span: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLSpanElement>) => (
      <span ref={ref} className={className} {...rest}>{children}</span>
    )),
  },
}));

vi.mock('../../../src/config/animations', () => ({
  TRANSITIONS: { fast: { duration: 0.1 }, normal: { duration: 0.2 } },
  hoverScale: { scale: 1.05 },
}));

import { AnimatedButton } from '../../../src/components/common/AnimatedButton';

describe('AnimatedButton', () => {
  it('renders with children text', () => {
    render(<AnimatedButton>Click Me</AnimatedButton>);
    expect(screen.getByText('Click Me')).toBeDefined();
  });

  it('applies primary variant styles by default', () => {
    render(<AnimatedButton>Primary</AnimatedButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[var(--brand-primary)]');
  });

  it('applies secondary variant styles', () => {
    render(<AnimatedButton variant="secondary">Secondary</AnimatedButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[var(--bg-panel-hover)]');
  });

  it('applies ghost variant styles', () => {
    render(<AnimatedButton variant="ghost">Ghost</AnimatedButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-[var(--bg-panel-hover)]');
  });

  it('applies danger variant styles', () => {
    render(<AnimatedButton variant="danger">Danger</AnimatedButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
  });

  it('applies size styles', () => {
    const { rerender } = render(<AnimatedButton size="sm">Sm</AnimatedButton>);
    expect(screen.getByRole('button').className).toContain('text-sm');

    rerender(<AnimatedButton size="lg">Lg</AnimatedButton>);
    expect(screen.getByRole('button').className).toContain('text-lg');
  });

  it('renders as disabled when disabled prop is true', () => {
    render(<AnimatedButton disabled>Disabled</AnimatedButton>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('renders as disabled when isLoading is true', () => {
    render(<AnimatedButton isLoading>Loading</AnimatedButton>);
    expect(screen.getByRole('button')).toHaveProperty('disabled', true);
  });

  it('renders icon when provided and not loading', () => {
    render(<AnimatedButton icon={<span data-testid="icon">IC</span>}>With Icon</AnimatedButton>);
    expect(screen.getByTestId('icon')).toBeDefined();
  });

  it('does not render icon when loading', () => {
    render(<AnimatedButton isLoading icon={<span data-testid="icon">IC</span>}>Loading</AnimatedButton>);
    expect(screen.queryByTestId('icon')).toBeNull();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<AnimatedButton onClick={onClick}>Click</AnimatedButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<AnimatedButton ref={ref}>Ref</AnimatedButton>);
    expect(ref.current).toBeDefined();
    expect(ref.current?.tagName).toBe('BUTTON');
  });
});
