#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Corrigindo erros de Build da UI (ToastContext e Vite Types)..."

# ==============================================================================
# 1. Corrigir Tipagem do Vite
# Resolve: Property 'env' does not exist on type 'ImportMeta'
# ==============================================================================
echo "📝 Criando packages/ui/src/vite-env.d.ts..."
cat > packages/ui/src/vite-env.d.ts <<EOF
/// <reference types="vite/client" />
EOF

# ==============================================================================
# 2. Implementar ToastContext Completo
# Resolve: has no exported member 'useToast'
# ==============================================================================
echo "📝 Reescrevendo packages/ui/src/contexts/ToastContext.tsx..."

cat > packages/ui/src/contexts/ToastContext.tsx <<EOF
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook exportado (Isso estava faltando)
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Container de Toasts (Visual) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={\`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-in fade-in slide-in-from-right-5 pointer-events-auto flex items-center gap-2 \${
              toast.type === 'success' ? 'bg-[#00b17a]' :
              toast.type === 'error' ? 'bg-[#ff3e5e]' :
              'bg-[#4ba3ff]'
            }\`}
          >
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
EOF

# ==============================================================================
# 3. Validação
# ==============================================================================
echo "🛡️  Validando Build da UI..."
pnpm --filter @mini-ide/ui build

echo "✅ Correções aplicadas. A UI deve compilar agora."
