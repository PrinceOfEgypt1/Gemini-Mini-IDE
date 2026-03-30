import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsModal } from '../../../src/components/settings/SettingsModal';
import { ThemeProvider } from '../../../src/contexts/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('SettingsModal', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns null when not open', () => {
    const { container } = renderWithTheme(
      <SettingsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal content when open', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Preferências')).toBeDefined();
    expect(screen.getByText('Salvar Preferências')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('renders provider preset buttons', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('openai')).toBeDefined();
    expect(screen.getByText('anthropic')).toBeDefined();
    expect(screen.getByText('google')).toBeDefined();
    expect(screen.getByText('ollama')).toBeDefined();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithTheme(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancelar is clicked', () => {
    const onClose = vi.fn();
    renderWithTheme(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('saves settings to sessionStorage on save', () => {
    const onClose = vi.fn();
    renderWithTheme(<SettingsModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Salvar Preferências'));
    expect(sessionStorage.getItem('mini-ide-model')).toBe('gpt-4o');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('loads saved settings from sessionStorage', () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');
    sessionStorage.setItem('mini-ide-model', 'claude-3-5-sonnet-latest');
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    const modelInput = screen.getByPlaceholderText('Selecione ou digite...') as HTMLInputElement;
    expect(modelInput.value).toBe('claude-3-5-sonnet-latest');
  });

  it('toggles API key visibility', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    const apiInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(apiInput.type).toBe('password');
    fireEvent.click(screen.getByText('Mostrar'));
    expect(apiInput.type).toBe('text');
    fireEvent.click(screen.getByText('Ocultar'));
    expect(apiInput.type).toBe('password');
  });

  it('toggles advanced settings', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText('https://api.openai.com/v1')).toBeNull();
    fireEvent.click(screen.getByText(/Mostrar Avançado/));
    expect(screen.getByPlaceholderText('https://api.openai.com/v1')).toBeDefined();
  });

  it('applies ollama preset and shows advanced settings', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('ollama'));
    const modelInput = screen.getByPlaceholderText('Selecione ou digite...') as HTMLInputElement;
    expect(modelInput.value).toBe('llama3.2');
    // Advanced should be visible after ollama preset
    expect(screen.getByPlaceholderText('https://api.openai.com/v1')).toBeDefined();
  });

  it('renders theme toggle buttons', () => {
    renderWithTheme(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Claro/)).toBeDefined();
    expect(screen.getByText(/Escuro/)).toBeDefined();
  });
});
