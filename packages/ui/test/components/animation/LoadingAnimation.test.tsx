import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, style, ...rest }: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} className={className} style={style} {...rest}>{children}</div>
    )),
    p: React.forwardRef(({ children, className, ...rest }: React.PropsWithChildren<{ className?: string }>, ref: React.Ref<HTMLParagraphElement>) => (
      <p ref={ref} className={className} {...rest}>{children}</p>
    )),
  },
}));

import { LoadingAnimation, WaveLoadingAnimation } from '../../../src/components/animation/LoadingAnimation';

describe('LoadingAnimation', () => {
  it('renders with default message', () => {
    render(<LoadingAnimation />);
    expect(screen.getByText('Carregando...')).toBeDefined();
  });

  it('renders with custom message', () => {
    render(<LoadingAnimation message="Processando dados..." />);
    expect(screen.getByText('Processando dados...')).toBeDefined();
  });

  it('renders without message when empty string', () => {
    render(<LoadingAnimation message="" />);
    expect(screen.queryByText('Carregando...')).toBeNull();
  });

  it('renders with sm size', () => {
    const { container } = render(<LoadingAnimation size="sm" />);
    expect(container.querySelector('.w-8')).toBeDefined();
  });

  it('renders with md size (default)', () => {
    const { container } = render(<LoadingAnimation />);
    expect(container.querySelector('.w-12')).toBeDefined();
  });

  it('renders with lg size', () => {
    const { container } = render(<LoadingAnimation size="lg" />);
    expect(container.querySelector('.w-16')).toBeDefined();
  });

  it('renders three inner dots', () => {
    const { container } = render(<LoadingAnimation />);
    // There are 3 dots rendered inside the inner container with absolute positioning
    const dots = container.querySelectorAll('[style*="left"]');
    expect(dots.length).toBe(3);
  });
});

describe('WaveLoadingAnimation', () => {
  it('renders with default message', () => {
    render(<WaveLoadingAnimation />);
    expect(screen.getByText('Carregando...')).toBeDefined();
  });

  it('renders with custom message', () => {
    render(<WaveLoadingAnimation message="Gerando..." />);
    expect(screen.getByText('Gerando...')).toBeDefined();
  });

  it('renders without message when empty string', () => {
    render(<WaveLoadingAnimation message="" />);
    expect(screen.queryByText('Carregando...')).toBeNull();
  });

  it('renders 5 wave bars', () => {
    const { container } = render(<WaveLoadingAnimation />);
    const bars = container.querySelectorAll('.rounded-full');
    // 5 bars
    expect(bars.length).toBe(5);
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<WaveLoadingAnimation size="sm" />);
    expect(container.querySelector('.h-6')).toBeDefined();

    rerender(<WaveLoadingAnimation size="lg" />);
    expect(container.querySelector('.h-12')).toBeDefined();
  });
});
