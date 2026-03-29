import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../../../src/components/layout/Header';

describe('Header', () => {
  const defaultProps = {
    onCreateClick: vi.fn(),
    onQuickStartClick: vi.fn(),
    onSettingsClick: vi.fn(),
    onHelpClick: vi.fn(),
  };

  it('renders the app title and version', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Gemini Mini-IDE')).toBeDefined();
    expect(screen.getByText('v0.17.1')).toBeDefined();
  });

  it('renders action buttons', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Criar')).toBeDefined();
    expect(screen.getByText('Quick Start')).toBeDefined();
  });

  it('calls onCreateClick when Criar is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByText('Criar'));
    expect(defaultProps.onCreateClick).toHaveBeenCalledTimes(1);
  });

  it('calls onQuickStartClick when Quick Start is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByText('Quick Start'));
    expect(defaultProps.onQuickStartClick).toHaveBeenCalledTimes(1);
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    render(<Header {...defaultProps} />);
    const settingsBtn = document.getElementById('btnPreferences');
    expect(settingsBtn).toBeDefined();
    fireEvent.click(settingsBtn!);
    expect(defaultProps.onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('calls onHelpClick when help button is clicked', () => {
    render(<Header {...defaultProps} />);
    fireEvent.click(screen.getByText('?'));
    expect(defaultProps.onHelpClick).toHaveBeenCalledTimes(1);
  });
});
