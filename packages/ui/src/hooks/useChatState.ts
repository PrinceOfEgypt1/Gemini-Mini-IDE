import { useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp?: number;
}

export interface ChatState {
  chatInput: string;
  chatHistory: ChatMessage[];
  chatMode: 'classic' | 'interactive';
}

export interface ChatActions {
  setChatInput: (input: string) => void;
  setChatHistory: (history: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setChatMode: (mode: 'classic' | 'interactive') => void;
  clearChat: () => void;
}

/**
 * Hook para gerenciar o estado do chat.
 * Centraliza a lógica de estado do chat e oferece ações tipadas.
 */
export function useChatState(): ChatState & ChatActions {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { 
      role: 'agent', 
      text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.',
      timestamp: Date.now()
    }
  ]);
  const [chatMode, setChatMode] = useState<'classic' | 'interactive'>('interactive');

  const addMessage = useCallback((message: ChatMessage) => {
    setChatHistory(prev => [...prev, { ...message, timestamp: message.timestamp || Date.now() }]);
  }, []);

  const clearChat = useCallback(() => {
    setChatInput('');
    setChatHistory([
      { 
        role: 'agent', 
        text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.',
        timestamp: Date.now()
      }
    ]);
  }, []);

  return {
    chatInput,
    chatHistory,
    chatMode,
    setChatInput,
    setChatHistory,
    addMessage,
    setChatMode,
    clearChat,
  };
}
