#!/usr/bin/env bash
set -e

echo "🎨 [Phase 13] Refinando UX do Modal de Preferências..."

UI_DIR="packages/ui/src/components/settings"

# ==============================================================================
# 1. Reescrever SettingsModal.tsx
# Organização: Cabeçalho "Preferências" -> Seção Geral -> Seção IA
# ==============================================================================
echo "📝 Atualizando $UI_DIR/SettingsModal.tsx..."

cat > $UI_DIR/SettingsModal.tsx <<EOF
import React, { useState, useEffect } from 'react';
import { Button } from '../Button';
import { useTheme } from '../../contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  
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
          <h3 className="font-semibold text-lg">Preferências</h3>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh]">
          
          {/* SEÇÃO: GERAL / APARÊNCIA */}
          <section>
            <h4 className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-3">Geral</h4>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Tema da Interface</span>
                <span className="text-xs text-[var(--text-secondary)]">Alterne entre claro e escuro</span>
              </div>
              <div className="flex gap-1 bg-[var(--bg-panel)] p-1 rounded-lg border border-[var(--border-main)]">
                <button 
                  onClick={() => setTheme('light')}
                  className={\`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 \${theme === 'light' ? 'bg-[#fbbf24] text-black shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]'}\`}
                >
                  ☀️ Claro
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={\`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 \${theme === 'dark' ? 'bg-[#4f46e5] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-hover)]'}\`}
                >
                  🌙 Escuro
                </button>
              </div>
            </div>
          </section>

          {/* Divisor */}
          <div className="h-px bg-[var(--border-main)]" />

          {/* SEÇÃO: INTELIGÊNCIA ARTIFICIAL */}
          <section className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider">Inteligência Artificial</h4>

            {/* Provedores Rápidos */}
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Provedores Rápidos</label>
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
            <div>
              <label className="text-sm font-medium block mb-1.5">API Key</label>
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
            <div>
              <label className="text-sm font-medium block mb-1.5">Modelo</label>
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
                {showAdvanced ? '▲ Ocultar Configurações Avançadas' : '▼ Mostrar Avançado (Base URL)'}
              </button>
              {showAdvanced && (
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="mt-2 w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-4 py-2 text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors font-mono text-sm"
                  placeholder="https://api.openai.com/v1"
                />
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-panel-hover)] border-t border-[var(--border-main)] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Preferências</Button>
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🛡️  Validando UI..."
pnpm --filter @mini-ide/ui lint
pnpm --filter @mini-ide/ui build

echo "✅ UX do Modal de Preferências ajustada!"
