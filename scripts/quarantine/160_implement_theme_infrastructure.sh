#!/usr/bin/env bash
set -e

echo "🎨 [Phase 13] Implementando Infraestrutura de Temas (Dark/Light)..."

UI_DIR="packages/ui/src"

# ==============================================================================
# 1. Criar ThemeContext
# Gerencia a persistência e a aplicação da classe 'dark' ou 'light' no HTML
# ==============================================================================
echo "📝 Criando $UI_DIR/contexts/ThemeContext.tsx..."

cat > $UI_DIR/contexts/ThemeContext.tsx <<EOF
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tenta ler do storage ou prefere dark por padrão
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('mini-ide-theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove a classe antiga
    root.classList.remove('light', 'dark');
    // Adiciona a nova
    root.classList.add(theme);
    // Salva
    localStorage.setItem('mini-ide-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
EOF

# ==============================================================================
# 2. Atualizar CSS Global com Variáveis Semânticas
# Define as cores para :root (Light) e .dark (Dark)
# ==============================================================================
echo "🎨 Atualizando $UI_DIR/index.css com Tokens de Design..."

cat > $UI_DIR/index.css <<EOF
@tailwind base;
@tailwind components;
@tailwind utilities;

/* --- Design Tokens --- */
:root {
  /* Light Mode (Padrão CSS se não tiver classe) */
  --bg-app: #f8fafc;         /* Slate-50 */
  --bg-panel: #ffffff;       /* White */
  --bg-panel-hover: #f1f5f9; /* Slate-100 */
  
  --border-main: #e2e8f0;    /* Slate-200 */
  --border-hover: #cbd5e1;   /* Slate-300 */
  
  --text-primary: #0f172a;   /* Slate-900 */
  --text-secondary: #64748b; /* Slate-500 */
  --text-muted: #94a3b8;     /* Slate-400 */
  
  --brand-primary: #2563eb;  /* Blue-600 */
  --brand-hover: #1d4ed8;    /* Blue-700 */
  
  --success: #16a34a;        /* Green-600 */
  --danger: #dc2626;         /* Red-600 */
  
  /* Driver.js overrides para Light */
  --driver-bg: #ffffff;
  --driver-text: #0f172a;
  --driver-border: #2563eb;
}

/* Dark Mode Override */
.dark {
  --bg-app: #0f1420;
  --bg-panel: #141b2b;
  --bg-panel-hover: #222b40;
  
  --border-main: #24304a;
  --border-hover: #4ba3ff;
  
  --text-primary: #e6ecff;
  --text-secondary: #9fb0d3;
  --text-muted: #4a5977;
  
  --brand-primary: #4ba3ff;
  --brand-hover: #3b82f6;
  
  --success: #47e6a1;
  --danger: #ff5c7a;
  
  /* Driver.js overrides para Dark */
  --driver-bg: #141b2b;
  --driver-text: #e6ecff;
  --driver-border: #ec4899;
}

/* Aplicação Global das Variáveis */
html, body {
  height: 100%;
  margin: 0;
  background-color: var(--bg-app);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Scrollbar customizada (se adapta ao tema) */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--bg-app); 
}
::-webkit-scrollbar-thumb {
  background: var(--border-main); 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--brand-primary); 
}

/* Driver.js Theme Fixes */
.driver-popover {
  background-color: var(--driver-bg) !important;
  color: var(--driver-text) !important;
  border: 2px solid var(--driver-border) !important;
}
.driver-popover-title {
  color: var(--driver-text) !important;
}
.driver-popover-description {
  color: var(--text-secondary) !important;
}
EOF

# ==============================================================================
# 3. Atualizar SettingsModal para usar o Toggle
# Substitui o badge estático por um controle funcional
# ==============================================================================
echo "🔄 Atualizando SettingsModal.tsx para incluir controle de Tema..."

# Vamos ler o arquivo e injetar o uso do hook useTheme
# Nota: Como o arquivo é grande, vamos reescrevê-lo com a integração do tema
cat > $UI_DIR/components/settings/SettingsModal.tsx <<EOF
import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme(); // Hook do tema
  
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [baseUrl, setBaseUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mini-ide-api-key') || '';
      const savedModel = localStorage.getItem('mini-ide-model') || 'gpt-4o';
      const savedUrl = localStorage.getItem('mini-ide-base-url') || 'https://api.openai.com/v1';
      
      setApiKey(savedKey);
      setModel(savedModel);
      setBaseUrl(savedUrl);
      
      if (savedUrl.includes('localhost') || savedUrl.includes('azure') || savedUrl.includes('aws')) {
        setShowAdvanced(true);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('mini-ide-api-key', apiKey);
    localStorage.setItem('mini-ide-model', model);
    localStorage.setItem('mini-ide-base-url', baseUrl);
    window.dispatchEvent(new Event('settings-updated'));
    onClose();
  };

  const applyPreset = (provider: string) => {
    switch(provider) {
      case 'openai': setBaseUrl('https://api.openai.com/v1'); setModel('gpt-4o'); break;
      case 'anthropic': setBaseUrl('https://api.anthropic.com/v1'); setModel('claude-3-5-sonnet-latest'); break;
      case 'google': setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/'); setModel('gemini-1.5-pro'); break;
      case 'deepseek': setBaseUrl('https://api.deepseek.com/v1'); setModel('deepseek-chat'); break;
      case 'xai': setBaseUrl('https://api.x.ai/v1'); setModel('grok-2'); break;
      case 'ollama': setBaseUrl('http://localhost:11434/v1'); setModel('llama3.2'); setApiKey('ollama'); setShowAdvanced(true); break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-2xl w-[600px] max-w-[95vw] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 text-[var(--text-primary)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-panel-hover)]">
          <h3 className="font-semibold text-lg">Configurações de IA</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          
          {/* Tema */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Aparência</span>
              <span className="text-xs text-[var(--text-secondary)]">Escolha o tema da interface</span>
            </div>
            <div className="flex gap-1 bg-[var(--bg-panel)] p-1 rounded-lg border border-[var(--border-main)]">
              <button 
                onClick={() => setTheme('light')}
                className={\`px-3 py-1 rounded-md text-xs transition-all \${theme === 'light' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]'}\`}
              >
                ☀️ Claro
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={\`px-3 py-1 rounded-md text-xs transition-all \${theme === 'dark' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]'}\`}
              >
                🌙 Escuro
              </button>
            </div>
          </div>

          {/* Provedores Rápidos */}
          <div>
            <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block uppercase tracking-wider">Provedores Rápidos</label>
            <div className="flex flex-wrap gap-2">
              {['openai', 'anthropic', 'google', 'deepseek', 'xai', 'ollama'].map(p => (
                <button 
                  key={p} 
                  onClick={() => applyPreset(p)} 
                  className="text-xs bg-[var(--bg-panel-hover)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)] border border-[var(--border-main)] px-3 py-1.5 rounded-md text-[var(--text-primary)] transition-colors capitalize"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <input
                type={isVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {isVisible ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Modelo</label>
            <input 
              type="text" 
              list="models" 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
              placeholder="Selecione ou digite..."
            />
            <datalist id="models">
              <option value="gpt-4o" /><option value="claude-3-5-sonnet-latest" /><option value="gemini-1.5-pro" />
              <option value="deepseek-chat" /><option value="llama3.2" />
            </datalist>
          </div>

          {/* Advanced */}
          <div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-[var(--brand-primary)] hover:underline">
              {showAdvanced ? '▲ Ocultar Avançado' : '▼ Mostrar Avançado (Base URL)'}
            </button>
            {showAdvanced && (
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mt-2 w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors font-mono text-sm"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-panel-hover)] border-t border-[var(--border-main)] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar</Button>
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 4. Injetar Provider no App.tsx
# ==============================================================================
echo "🔄 Envolvendo App em ThemeProvider..."

APP_FILE="$UI_DIR/App.tsx"
# Adiciona import
sed -i "1s/^/import { ThemeProvider } from '.\/contexts\/ThemeContext';\n/" "$APP_FILE"

# Substitui <ToastProvider> por <ThemeProvider><ToastProvider>...
sed -i 's/<ToastProvider>/<ThemeProvider><ToastProvider>/' "$APP_FILE"
sed -i 's/<\/ToastProvider>/<\/ToastProvider><\/ThemeProvider>/' "$APP_FILE"

# ==============================================================================
# 5. Validação
# ==============================================================================
echo "🛡️  Validando Build..."
pnpm --filter @mini-ide/ui build

echo "✅ Infraestrutura de Temas (Light/Dark) implementada!"
