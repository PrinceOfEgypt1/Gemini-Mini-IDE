#!/usr/bin/env bash
set -e

echo "🚑 Sprint 6.10: Corrigindo Regressão de Lint em ToastContext..."

# Reescreve ToastContext.tsx SEM a primeira linha de eslint-disable,
# mas MANTENDO os comentários TSDoc adicionados na Sprint 6.9.
cat > packages/ui/src/contexts/ToastContext.tsx <<EOF
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

echo "✅ Regressão corrigida."
echo "👉 Execute ./42_pipeline_checklist.sh para validar."
