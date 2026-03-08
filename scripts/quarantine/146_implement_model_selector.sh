#!/usr/bin/env bash
set -e

echo "⚙️  [Phase 12] Implementando Seletor de Modelos e Base URL customizada..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Atualizar SettingsModal.tsx
# Adicionar campo Base URL e lógica de persistência avançada
# ==============================================================================
echo "📝 Atualizando packages/ui/src/components/settings/SettingsModal.tsx..."

cat > $UI_DIR/src/components/settings/SettingsModal.tsx <<EOF
import React, { useState, useEffect } from 'react';
import { Button } from '../Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [baseUrl, setBaseUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Carregar configurações salvas ao abrir
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mini-ide-api-key') || '';
      const savedModel = localStorage.getItem('mini-ide-model') || 'deepseek-chat';
      const savedUrl = localStorage.getItem('mini-ide-base-url') || 'https://api.deepseek.com/v1';
      
      setApiKey(savedKey);
      setModel(savedModel);
      setBaseUrl(savedUrl);
      
      // Se a URL for diferente do padrão ou usar modelo local, abre o avançado
      if (savedUrl.includes('localhost') || savedUrl.includes('127.0.0.1')) {
        setShowAdvanced(true);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('mini-ide-api-key', apiKey);
    localStorage.setItem('mini-ide-model', model);
    localStorage.setItem('mini-ide-base-url', baseUrl);
    
    // Dispara evento customizado para notificar a API (se necessário recarregar configs)
    window.dispatchEvent(new Event('settings-updated'));
    onClose();
  };

  // Predefinições para facilitar
  const applyPreset = (preset: 'deepseek' | 'openai' | 'ollama') => {
    if (preset === 'deepseek') {
      setBaseUrl('https://api.deepseek.com/v1');
      setModel('deepseek-chat');
    } else if (preset === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4-turbo');
    } else if (preset === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModel('llama3');
      setApiKey('ollama'); // Ollama geralmente não precisa de chave, mas o campo não pode ser vazio
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[500px] max-w-[95vw] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727]">
          <h3 className="text-[#e6ecff] font-semibold text-lg">Configurações de IA</h3>
          <button 
            onClick={onClose}
            className="text-[#9fb0d3] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5">
          
          {/* Presets Rápidos */}
          <div className="flex gap-2 mb-2">
            <button onClick={() => applyPreset('deepseek')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1 rounded-full text-[#e6ecff] transition-colors">DeepSeek</button>
            <button onClick={() => applyPreset('openai')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1 rounded-full text-[#e6ecff] transition-colors">OpenAI</button>
            <button onClick={() => { applyPreset('ollama'); setShowAdvanced(true); }} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1 rounded-full text-[#e6ecff] transition-colors">Local (Ollama)</button>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              API Key
            </label>
            <div className="relative">
              <input
                type={isVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9fb0d3] hover:text-white"
              >
                {isVisible ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              Modelo
            </label>
            <input 
              type="text" 
              list="models" 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors"
              placeholder="Selecione ou digite o modelo..."
            />
            <datalist id="models">
              <option value="deepseek-chat" />
              <option value="deepseek-coder" />
              <option value="gpt-4-turbo" />
              <option value="gpt-3.5-turbo" />
              <option value="claude-3-sonnet" />
              <option value="llama3" />
              <option value="mistral" />
            </datalist>
          </div>

          {/* Advanced Toggle */}
          <div>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#4ba3ff] hover:underline flex items-center gap-1"
            >
              {showAdvanced ? '▲ Ocultar Avançado' : '▼ Mostrar Avançado (Base URL)'}
            </button>

            {showAdvanced && (
              <div className="mt-3 animate-in slide-in-from-top-2">
                <label className="text-sm font-medium text-[#e6ecff] block mb-2">
                  Base URL (Endpoint API)
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#9fb0d3] focus:outline-none focus:border-[#4ba3ff] transition-colors font-mono text-sm"
                />
                <p className="text-[10px] text-[#9fb0d3] mt-1">
                  Para Ollama local use: <code>http://localhost:11434/v1</code>
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#101727] border-t border-[#24304a] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Salvar Configuração
          </Button>
        </div>

      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🛡️  Validando alterações na UI..."
pnpm --filter @mini-ide/ui lint
pnpm --filter @mini-ide/ui build

echo "✅ Seletor de Modelos implementado com sucesso!"
EOF

chmod +x scripts/146_implement_model_selector.sh
