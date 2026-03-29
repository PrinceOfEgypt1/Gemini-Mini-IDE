import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HelpModal } from '../../../src/components/help/HelpModal';

describe('HelpModal', () => {
  it('returns null when not open', () => {
    const { container } = render(<HelpModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal content when open', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Manual do Usuário')).toBeDefined();
    expect(screen.getByText('Entendi')).toBeDefined();
  });

  it('renders manual content sections', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Manual do Gemini Mini-IDE')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Entendi button is clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Entendi'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
