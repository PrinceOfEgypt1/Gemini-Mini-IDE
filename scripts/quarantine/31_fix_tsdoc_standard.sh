#!/usr/bin/env bash
set -e

echo "📚 Sprint 6.9: Aplicando padrão TSDoc (Regra 5.2 do Prompt-Mestre)..."

# ------------------------------------------------------------------------------
# 1. SHARED (Contratos de API)
# ------------------------------------------------------------------------------
echo "📝 Documentando @mini-ide/shared..."

cat > packages/shared/src/types/analyze-request.ts <<EOF
/**
 * Representa o corpo da requisição enviada ao endpoint de análise.
 */
export interface AnalyzeRequest {
  /**
   * O texto ou código fonte que será analisado pelo agente.
   * @example "Quero criar um sistema de login em React."
   */
  text: string;

  /**
   * O tamanho máximo permitido para o resumo da resposta (em caracteres).
   * @defaultValue 100
   */
  maxLen?: number;
}
EOF

cat > packages/shared/src/types/analyze-response.ts <<EOF
/**
 * Representa a resposta estruturada retornada pelo endpoint de análise.
 */
export interface AnalyzeResponse {
  /**
   * Um resumo textual da análise gerada pelo agente.
   */
  summary: string;

  /**
   * O número de caracteres do texto de entrada.
   */
  inputLength: number;

  /**
   * O número de caracteres do resumo gerado.
   */
  outputLength: number;

  /**
   * Identificador único da requisição (UUID v4) para rastreabilidade.
   */
  requestId: string;

  /**
   * Data e hora da geração da resposta em formato ISO 8601.
   */
  timestamp: string;

  /**
   * Custo estimado da operação (se aplicável).
   */
  budgetUsed?: number;

  /**
   * Orçamento restante do usuário após a operação.
   */
  budgetRemaining?: number;
}
EOF

# ------------------------------------------------------------------------------
# 2. ANALYSIS AGENT (Inteligência)
# ------------------------------------------------------------------------------
echo "📝 Documentando @mini-ide/analysis-agent..."

cat > packages/analysis-agent/src/providers/llm-provider.ts <<EOF
/**
 * Estrutura padronizada para respostas de qualquer provedor de LLM.
 */
export interface LLMResponse {
  /** Conteúdo textual gerado pelo modelo. */
  content: string;
  /** Métricas de uso de tokens. */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Interface que deve ser implementada por qualquer adaptador de LLM (Mock, DeepSeek, OpenAI, etc).
 * Permite a troca de modelos sem afetar a lógica de negócio.
 */
export interface LLMProvider {
  /**
   * Envia um prompt para o modelo e retorna a resposta gerada.
   * @param prompt - O texto de entrada para o modelo.
   * @returns Uma Promise contendo a resposta estruturada.
   */
  generate(prompt: string): Promise<LLMResponse>;
}
EOF

# ------------------------------------------------------------------------------
# 3. UI (Componentes)
# ------------------------------------------------------------------------------
echo "📝 Documentando @mini-ide/ui..."

cat > packages/ui/src/components/common/Button.tsx <<EOF
import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/**
 * Propriedades do componente Button.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Estilo visual do botão.
   * @defaultValue 'secondary'
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Se verdadeiro, exibe um spinner e desabilita o botão.
   * @defaultValue false
   */
  isLoading?: boolean;
}

/**
 * Componente de botão padrão da aplicação.
 * Suporta variantes visuais e estado de carregamento automático.
 * 
 * @param props - Propriedades do botão (incluindo props HTML padrão).
 */
export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}) => {
  return (
    <button 
      className={clsx('btn', variant, className)} 
      disabled={disabled || isLoading}
      style={{ opacity: (disabled || isLoading) ? 0.7 : 1, cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
};
EOF

cat > packages/ui/src/contexts/ToastContext.tsx <<EOF
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/** Tipos de notificação suportados. */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Representação interna de uma notificação Toast. */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

/** Interface pública do Contexto de Toasts. */
export interface ToastContextProps {
  /**
   * Exibe uma nova notificação na tela.
   * @param message - Texto da mensagem.
   * @param type - Tipo da notificação (cor e ícone). Padrão: 'info'.
   */
  addToast: (message: string, type?: ToastType) => void;
  
  /**
   * Remove uma notificação específica pelo ID.
   * @param id - ID do toast a ser removido.
   */
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(undefined);

/**
 * Provedor global de notificações. Deve envolver a aplicação raiz.
 * Gerencia o estado da lista de toasts e renderiza o container visual.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="toast" style={{
            background: 'var(--panel-2)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '300px',
            display: 'flex', alignItems: 'center', gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: 'var(--text)'
          }}>
            {toast.type === 'success' && <CheckCircle size={20} color="var(--ok)" />}
            {toast.type === 'error' && <AlertCircle size={20} color="var(--danger)" />}
            {toast.type === 'info' && <Info size={20} color="var(--brand)" />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
EOF

# Recompilar shared para garantir que d.ts tenham os comentários
echo "🏗️ Recompilando shared..."
pnpm --filter @mini-ide/shared build

echo "✅ Código documentado com TSDoc!"
echo "👉 Execute ./42_pipeline_checklist.sh para garantir integridade."
