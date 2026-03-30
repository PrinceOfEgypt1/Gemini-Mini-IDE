import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickStartGallery } from '../../../src/components/wizard/QuickStartGallery';

describe('QuickStartGallery', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTemplate: vi.fn(),
    onStartTour: vi.fn(),
  };

  it('returns null when not open', () => {
    const { container } = render(
      <QuickStartGallery {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders gallery with templates when open', () => {
    render(<QuickStartGallery {...defaultProps} />);
    expect(screen.getByText('API REST Node.js')).toBeDefined();
    expect(screen.getByText('React Dashboard')).toBeDefined();
    expect(screen.getByText('Script Python')).toBeDefined();
    expect(screen.getByText('Microserviço Go')).toBeDefined();
  });

  it('calls onSelectTemplate and onClose when a template is clicked', () => {
    render(<QuickStartGallery {...defaultProps} />);
    fireEvent.click(screen.getByText('API REST Node.js'));
    expect(defaultProps.onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(defaultProps.onSelectTemplate).toHaveBeenCalledWith(
      expect.stringContaining('API REST')
    );
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose then onStartTour when tour button is clicked', () => {
    render(<QuickStartGallery {...defaultProps} />);
    fireEvent.click(screen.getByText('Iniciar Tour'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onStartTour).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<QuickStartGallery {...defaultProps} />);
    fireEvent.click(screen.getByText('✕'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
