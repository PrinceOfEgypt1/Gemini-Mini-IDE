import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock crypto.randomUUID
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2) });

// Mock scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

import { ConversationChat } from '../../../src/components/chat/ConversationChat';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('ConversationChat', () => {
  it('renders empty state with placeholder text', () => {
    render(<ConversationChat />);
    expect(screen.getByText('Chat Interativo')).toBeDefined();
    expect(screen.getByText(/Descreva o que voce quer criar/)).toBeDefined();
  });

  it('renders textarea and send button when hideInput is false', () => {
    render(<ConversationChat />);
    expect(screen.getByPlaceholderText(/Descreva seu projeto/)).toBeDefined();
    expect(screen.getByText('Enviar')).toBeDefined();
  });

  it('hides internal input when hideInput is true', () => {
    render(<ConversationChat hideInput={true} />);
    expect(screen.queryByPlaceholderText(/Descreva seu projeto/)).toBeNull();
  });

  it('shows warning toast when sending without API key', async () => {
    const onToast = vi.fn();
    render(<ConversationChat onToast={onToast} />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'Criar um app' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith(
        'Configure sua API Key nas Preferencias para continuar.',
        'warning'
      );
    });
  });

  it('starts a new conversation when API key is set and no session exists', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');
    sessionStorage.setItem('mini-ide-model', 'test-model');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'agent',
          content: 'Ola! Como posso ajudar?',
          timestamp: new Date().toISOString(),
        },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
        options: ['Opcao 1', 'Opcao 2'],
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'Quero um app de tarefas' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/Quero um app de tarefas/)).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByText(/Ola! Como posso ajudar/)).toBeDefined();
    });

    // Phase indicator should appear (may appear in both header and message badge)
    expect(screen.getAllByText('Conhecendo Voce').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Assistente de Perfil')).toBeDefined();

    // Options should appear
    expect(screen.getByText('Opcao 1')).toBeDefined();
    expect(screen.getByText('Opcao 2')).toBeDefined();
  });

  it('handles fetch error gracefully when starting conversation', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Servidor indisponivel' }),
    });

    const onToast = vi.fn();
    render(<ConversationChat onToast={onToast} />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'teste' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/Erro: Servidor indisponivel/)).toBeDefined();
    });
    expect(onToast).toHaveBeenCalledWith('Servidor indisponivel', 'error');
  });

  it('handles network error gracefully', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    const onToast = vi.fn();
    render(<ConversationChat onToast={onToast} />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'teste' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/Erro: Network failure/)).toBeDefined();
    });
  });

  it('supports Ctrl+Enter to send message', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Resposta', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'via teclado' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it('clicking an option sends it as a message', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    // First call starts conversation
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Escolha', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
        options: ['Sim', 'Nao'],
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'iniciar' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Sim')).toBeDefined();
    });

    // Second call responds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-2', sessionId: 'session-1', role: 'agent', content: 'Otimo!', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_emotions',
        currentAgent: 'emotional_intelligence',
        isComplete: false,
      }),
    });

    fireEvent.click(screen.getByText('Sim'));

    await waitFor(() => {
      expect(screen.getByText('Otimo!')).toBeDefined();
    });
  });

  it('shows skip button for non-engineering, non-completed phases', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Cont', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
        options: ['Opcao A'],
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'start' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Pular')).toBeDefined();
    });
  });

  it('shows Nova Conversa button when phase is completed and hideInput is false', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Concluido!', timestamp: new Date().toISOString() },
        currentPhase: 'completed',
        currentAgent: 'code_gen',
        isComplete: true,
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'start' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Nova Conversa')).toBeDefined();
    });

    // Click Nova Conversa to reset
    fireEvent.click(screen.getByText('Nova Conversa'));

    // Should return to empty state
    await waitFor(() => {
      expect(screen.getByText('Chat Interativo')).toBeDefined();
    });
  });

  it('shows Nova Conversa button when hideInput is true and phase is completed', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Done', timestamp: new Date().toISOString() },
        currentPhase: 'completed',
        currentAgent: 'code_gen',
        isComplete: true,
      }),
    });

    const ref = React.createRef<{ sendMessage: (text: string) => void }>();
    render(<ConversationChat ref={ref} hideInput={true} />);

    // Send via ref (imperative handle)
    ref.current?.sendMessage('teste via ref');

    await waitFor(() => {
      expect(screen.getByText('Nova Conversa')).toBeDefined();
    });
  });

  it('handles respond error when session exists', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');

    // Start conversation
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'Go', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
      }),
    });

    const onToast = vi.fn();
    render(<ConversationChat onToast={onToast} />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'start' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText('Go')).toBeDefined();
    });

    // Respond with error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Erro na resposta' }),
    });

    fireEvent.change(textarea, { target: { value: 'resposta' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(screen.getByText(/Erro: Erro na resposta/)).toBeDefined();
    });
  });

  it('does not send empty messages', () => {
    sessionStorage.setItem('mini-ide-api-key', 'test-key');
    render(<ConversationChat />);

    fireEvent.click(screen.getByText('Enviar'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('includes auth headers from sessionStorage', async () => {
    sessionStorage.setItem('mini-ide-api-key', 'my-key');
    sessionStorage.setItem('mini-ide-model', 'my-model');
    sessionStorage.setItem('mini-ide-base-url', 'https://custom.api');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'session-1',
        message: { id: 'msg-1', sessionId: 'session-1', role: 'agent', content: 'ok', timestamp: new Date().toISOString() },
        currentPhase: 'human_layer_profiling',
        currentAgent: 'user_profiler',
        isComplete: false,
      }),
    });

    render(<ConversationChat />);

    const textarea = screen.getByPlaceholderText(/Descreva seu projeto/);
    fireEvent.change(textarea, { target: { value: 'msg' } });
    fireEvent.click(screen.getByText('Enviar'));

    await waitFor(() => {
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer my-key');
      expect(headers['X-LLM-Model']).toBe('my-model');
      expect(headers['X-LLM-Base-URL']).toBe('https://custom.api');
    });
  });
});
