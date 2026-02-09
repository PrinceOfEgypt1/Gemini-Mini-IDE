/**
 * @fileoverview Chat conversacional interativo.
 * Integra com o InteractiveOrchestrator via API de conversas.
 * @module components/chat/ConversationChat
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../common/Button';

const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  agentType?: string;
  timestamp: string;
  options?: string[];
  phase?: string;
}

interface InteractionResult {
  sessionId: string;
  message: {
    id: string;
    sessionId: string;
    role: 'user' | 'agent';
    agentType?: string;
    content: string;
    timestamp: string;
  };
  currentPhase: string;
  currentAgent: string;
  isComplete: boolean;
  options?: string[];
}

interface ConversationChatProps {
  /** Callback quando o projeto é gerado */
  onProjectGenerated?: (result: unknown) => void;
  /** Callback para mostrar toast */
  onToast?: (message: string, type: 'success' | 'error' | 'warning') => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = sessionStorage.getItem('mini-ide-api-key');
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
};

const PHASE_LABELS: Record<string, string> = {
  human_layer_profiling: 'Conhecendo Voce',
  human_layer_emotions: 'Contexto Emocional',
  human_layer_adaptation: 'Estrategia de Comunicacao',
  strategic_layer_decisions: 'Decisoes Tecnicas',
  strategic_layer_experience: 'Design de Experiencia',
  engineering_layer: 'Gerando Projeto',
  completed: 'Concluido'
};

const AGENT_LABELS: Record<string, string> = {
  user_profiler: 'Assistente de Perfil',
  emotional_intelligence: 'Assistente Empatico',
  adaptive_interaction: 'Estrategista',
  autonomous_decision: 'Decisor Tecnico',
  experience_designer: 'Designer de Experiencia',
  analysis: 'Analista',
  code_gen: 'Gerador de Codigo'
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ConversationChat: React.FC<ConversationChatProps> = ({
  onProjectGenerated,
  onToast
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [currentAgent, setCurrentAgent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }]);
  }, []);

  const handleInteractionResult = useCallback((result: InteractionResult) => {
    setCurrentPhase(result.currentPhase);
    setCurrentAgent(result.currentAgent);
    setCurrentOptions(result.options || []);

    addMessage({
      role: 'agent',
      content: result.message.content,
      agentType: result.message.agentType,
      phase: result.currentPhase,
      options: result.options
    });

    if (result.isComplete) {
      setCurrentOptions([]);
    }
  }, [addMessage]);

  // ─────────────────────────────────────────────────────────
  // START CONVERSATION
  // ─────────────────────────────────────────────────────────
  const startConversation = useCallback(async (message: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: 'default-user', message })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao iniciar conversa');
      }

      const result: InteractionResult = await response.json();
      setSessionId(result.sessionId);
      handleInteractionResult(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      addMessage({ role: 'agent', content: `Erro: ${errMsg}` });
      onToast?.(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [handleInteractionResult, addMessage, onToast]);

  // ─────────────────────────────────────────────────────────
  // RESPOND TO AGENT
  // ─────────────────────────────────────────────────────────
  const respondToAgent = useCallback(async (message: string) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao responder');
      }

      const result: InteractionResult = await response.json();
      handleInteractionResult(result);

      // Se entrou na fase de engenharia, pergunta se quer gerar
      if (result.currentPhase === 'engineering_layer') {
        setCurrentOptions(['Gerar agora!', 'Quero revisar algo antes']);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      addMessage({ role: 'agent', content: `Erro: ${errMsg}` });
      onToast?.(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, handleInteractionResult, addMessage, onToast]);

  // ─────────────────────────────────────────────────────────
  // FINALIZE (GENERATE PROJECT)
  // ─────────────────────────────────────────────────────────
  const finalizeConversation = useCallback(async () => {
    if (!sessionId) return;

    setIsGenerating(true);
    addMessage({
      role: 'agent',
      content: 'Gerando seu projeto completo... Isso pode levar alguns instantes.',
      agentType: 'code_gen'
    });

    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/finalize`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao gerar projeto');
      }

      const result = await response.json();
      const fileCount = result.engine?.files?.length || 0;

      addMessage({
        role: 'agent',
        content: `Projeto gerado com sucesso! ${fileCount} arquivos criados.`,
        agentType: 'code_gen'
      });

      setCurrentPhase('completed');
      setCurrentOptions([]);
      onProjectGenerated?.(result);
      onToast?.(`Projeto gerado com ${fileCount} arquivos!`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      addMessage({ role: 'agent', content: `Erro na geração: ${errMsg}` });
      onToast?.(errMsg, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, addMessage, onProjectGenerated, onToast]);

  // ─────────────────────────────────────────────────────────
  // SKIP AGENT
  // ─────────────────────────────────────────────────────────
  const skipAgent = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${sessionId}/skip`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao pular agente');
      }

      const result: InteractionResult = await response.json();
      handleInteractionResult(result);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      addMessage({ role: 'agent', content: `Erro: ${errMsg}` });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, handleInteractionResult, addMessage]);

  // ─────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text?: string) => {
    const message = text || inputValue.trim();
    if (!message) return;

    const apiKey = sessionStorage.getItem('mini-ide-api-key');
    if (!apiKey) {
      onToast?.('Configure sua API Key nas Preferencias para continuar.', 'warning');
      return;
    }

    setInputValue('');
    setCurrentOptions([]);

    addMessage({ role: 'user', content: message });

    // Se estamos na fase de engenharia e o usuario quer gerar
    if (currentPhase === 'engineering_layer') {
      const lower = message.toLowerCase();
      if (lower.includes('gerar') || lower.includes('sim') || lower.includes('agora')) {
        await finalizeConversation();
        return;
      }
    }

    // Se nao tem sessao, inicia uma nova conversa
    if (!sessionId) {
      await startConversation(message);
    } else {
      await respondToAgent(message);
    }
  }, [inputValue, sessionId, currentPhase, startConversation, respondToAgent, finalizeConversation, addMessage, onToast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOptionClick = (option: string) => {
    handleSend(option);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
    setCurrentPhase('');
    setCurrentAgent('');
    setCurrentOptions([]);
    setIsLoading(false);
    setIsGenerating(false);
    setInputValue('');
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Phase indicator */}
      {currentPhase && (
        <div className="flex-none px-3 py-2 bg-[var(--bg-panel-hover)] border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {PHASE_LABELS[currentPhase] || currentPhase}
            </span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {AGENT_LABELS[currentAgent] || currentAgent}
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="text-4xl">💬</div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Chat Interativo</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-60">
              Descreva o que voce quer criar e eu vou te guiar passo a passo, adaptando tudo ao seu perfil.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg border text-sm ${
              msg.role === 'agent'
                ? 'bg-[var(--bg-panel)] border-[var(--border-main)]'
                : 'bg-[var(--bg-panel-hover)] border-[var(--brand-primary)]/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <strong className={`text-xs ${
                msg.role === 'agent' ? 'text-[var(--brand-primary)]' : 'text-[var(--success)]'
              }`}>
                {msg.role === 'agent'
                  ? (msg.agentType ? AGENT_LABELS[msg.agentType] || msg.agentType : 'Agente')
                  : 'Voce'}
              </strong>
              {msg.phase && (
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-panel-hover)] px-1.5 py-0.5 rounded">
                  {PHASE_LABELS[msg.phase] || msg.phase}
                </span>
              )}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {(isLoading || isGenerating) && (
          <div className="flex items-center gap-2 p-3 text-xs text-[var(--text-muted)]">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{isGenerating ? 'Gerando projeto...' : 'Processando...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Options buttons */}
      {currentOptions.length > 0 && !isLoading && !isGenerating && (
        <div className="flex-none px-3 py-2 flex flex-wrap gap-2 border-t border-[var(--border-main)]">
          {currentOptions.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              className="px-3 py-1.5 text-xs rounded-full border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors"
            >
              {option}
            </button>
          ))}
          {sessionId && currentPhase !== 'engineering_layer' && currentPhase !== 'completed' && (
            <button
              onClick={skipAgent}
              className="px-3 py-1.5 text-xs rounded-full border border-[var(--border-main)] text-[var(--text-muted)] hover:border-[var(--text-primary)] transition-colors"
            >
              Pular
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex-none px-3 py-2 border-t border-[var(--border-main)]">
        {currentPhase === 'completed' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNewConversation}
            className="w-full"
          >
            Nova Conversa
          </Button>
        ) : (
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sessionId ? 'Responda aqui... (Ctrl+Enter para enviar)' : 'Descreva seu projeto... (Ctrl+Enter para enviar)'}
              className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)] resize-none h-10"
              disabled={isLoading || isGenerating}
              rows={1}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSend()}
              disabled={isLoading || isGenerating || !inputValue.trim()}
              isLoading={isLoading}
            >
              Enviar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
