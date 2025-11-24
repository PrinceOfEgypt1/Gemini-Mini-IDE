#!/usr/bin/env bash
set -e

echo "⚙️  [Phase 12] Expandindo lista de Modelos LLM e Provedores..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Atualizar SettingsModal.tsx
# - Adiciona botões de preset para os grandes provedores
# - Expande o datalist com IDs reais de mercado
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
  const [model, setModel] = useState('gpt-4o');
  const [baseUrl, setBaseUrl] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Carregar configurações salvas ao abrir
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mini-ide-api-key') || '';
      const savedModel = localStorage.getItem('mini-ide-model') || 'gpt-4o';
      const savedUrl = localStorage.getItem('mini-ide-base-url') || 'https://api.openai.com/v1';
      
      setApiKey(savedKey);
      setModel(savedModel);
      setBaseUrl(savedUrl);
      
      // Se a URL for customizada (local ou enterprise), abre o avançado
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

  // Presets inteligentes: Configuram URL e Modelo Padrão
  const applyPreset = (provider: string) => {
    switch(provider) {
      case 'openai':
        setBaseUrl('https://api.openai.com/v1');
        setModel('gpt-4o');
        break;
      case 'anthropic':
        setBaseUrl('https://api.anthropic.com/v1');
        setModel('claude-3-5-sonnet-latest');
        break;
      case 'google':
        // Endpoint compatível com OpenAI do Google
        setBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/');
        setModel('gemini-1.5-pro');
        break;
      case 'deepseek':
        setBaseUrl('https://api.deepseek.com/v1');
        setModel('deepseek-chat');
        break;
      case 'xai':
        setBaseUrl('https://api.x.ai/v1');
        setModel('grok-2');
        break;
      case 'ollama':
        setBaseUrl('http://localhost:11434/v1');
        setModel('llama3.2');
        setApiKey('ollama'); // Placeholder
        setShowAdvanced(true);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[600px] max-w-[95vw] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727]">
          <h3 className="text-[#e6ecff] font-semibold text-lg">Configurações de IA</h3>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          
          {/* Provedores Rápidos */}
          <div>
            <label className="text-xs font-medium text-[#9fb0d3] mb-2 block uppercase tracking-wider">Provedores Rápidos</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyPreset('openai')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1.5 rounded-md text-[#e6ecff] transition-colors">OpenAI</button>
              <button onClick={() => applyPreset('anthropic')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1.5 rounded-md text-[#e6ecff] transition-colors">Claude</button>
              <button onClick={() => applyPreset('google')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1.5 rounded-md text-[#e6ecff] transition-colors">Gemini</button>
              <button onClick={() => applyPreset('deepseek')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1.5 rounded-md text-[#e6ecff] transition-colors">DeepSeek</button>
              <button onClick={() => applyPreset('xai')} className="text-xs bg-[#222b40] hover:bg-[#4ba3ff]/20 border border-[#24304a] px-3 py-1.5 rounded-md text-[#e6ecff] transition-colors">Grok (xAI)</button>
              <button onClick={() => applyPreset('ollama')} className="text-xs bg-[#222b40] hover:bg-[#47e6a1]/20 border border-[#47e6a1]/40 text-[#47e6a1] px-3 py-1.5 rounded-md transition-colors">Local (Ollama)</button>
            </div>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">API Key</label>
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
            <label className="text-sm font-medium text-[#e6ecff]">Modelo</label>
            <input 
              type="text" 
              list="models" 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors"
              placeholder="Selecione ou digite o modelo ID..."
            />
            <datalist id="models">
              {/* OpenAI */}
              <option value="gpt-4o" />
              <option value="gpt-4-turbo" />
              <option value="gpt-3.5-turbo" />
              <option value="o1-preview" />
              <option value="o1-mini" />
              
              {/* Anthropic */}
              <option value="claude-3-5-sonnet-latest" />
              <option value="claude-3-opus-latest" />
              <option value="claude-3-haiku-20240307" />
              
              {/* Google */}
              <option value="gemini-1.5-pro" />
              <option value="gemini-1.5-flash" />
              
              {/* DeepSeek */}
              <option value="deepseek-chat" />
              <option value="deepseek-coder" />
              
              {/* xAI */}
              <option value="grok-2" />
              <option value="grok-2-mini" />
              
              {/* Meta / Open Source (para Ollama/Groq/Together) */}
              <option value="llama3.1-70b" />
              <option value="llama3.2" />
              <option value="mixtral-8x7b" />
              <option value="mistral-large-latest" />
              <option value="command-r-plus" />
            </datalist>
            <p className="text-[10px] text-[#9fb0d3]">
              Digite o ID do modelo conforme a documentação do provedor (ex: <code>gpt-4o</code>, <code>claude-3-5-sonnet-latest</code>).
            </p>
          </div>

          {/* Advanced Toggle */}
          <div>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-[#4ba3ff] hover:underline flex items-center gap-1"
            >
              {showAdvanced ? '▲ Ocultar Configurações Avançadas' : '▼ Mostrar Configurações Avançadas (Base URL)'}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 bg-[#0f1420] border border-[#24304a] rounded-lg animate-in slide-in-from-top-2">
                <label className="text-sm font-medium text-[#e6ecff] block mb-2">
                  Base URL (Endpoint API)
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-[#141b2b] border border-[#24304a] rounded-lg px-4 py-2 text-[#9fb0d3] focus:outline-none focus:border-[#4ba3ff] transition-colors font-mono text-sm"
                />
                <p className="text-[10px] text-[#9fb0d3] mt-2 leading-relaxed">
                  Útil para <strong>Azure OpenAI</strong>, <strong>AWS Bedrock</strong> (via proxy), <strong>Ollama</strong> (<code>http://localhost:11434/v1</code>) ou proxies corporativos. Mantenha o padrão do provedor se não tiver certeza.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#101727] border-t border-[#24304a] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Configuração</Button>
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

echo "✅ Lista de modelos expandida com sucesso!"
EOF

chmod +x scripts/147_expand_model_options.sh
