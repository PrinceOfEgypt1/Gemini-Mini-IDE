import React, { useState, useEffect } from 'react';
import { Button } from '../Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [isVisible, setIsVisible] = useState(false);

  // Carregar configurações salvas ao abrir
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mini-ide-api-key') || '';
      const savedModel = localStorage.getItem('mini-ide-model') || 'deepseek-chat';
      setApiKey(savedKey);
      setModel(savedModel);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('mini-ide-api-key', apiKey);
    localStorage.setItem('mini-ide-model', model);
    // Dispara evento customizado para notificar outros componentes se necessário
    window.dispatchEvent(new Event('settings-updated'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[500px] max-w-[95vw] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727]">
          <h3 className="text-[#e6ecff] font-semibold text-lg">Configurações & Preferências</h3>
          <button 
            onClick={onClose}
            className="text-[#9fb0d3] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* API Key Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              API Key (DeepSeek / OpenAI)
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
            <p className="text-xs text-[#9fb0d3]">
              Sua chave é salva apenas no navegador (localStorage) e enviada diretamente ao agente.
            </p>
          </div>

          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              Modelo LLM
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors appearance-none"
            >
              <option value="deepseek-chat">DeepSeek-V3 (Recomendado)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="h-px bg-[#24304a]"></div>

          {/* Preferences */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#e6ecff]">Modo Escuro</span>
            <span className="text-xs text-[#47e6a1] bg-[#47e6a1]/10 px-2 py-1 rounded-full border border-[#47e6a1]/30">
              Ativado (Padrão)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#101727] border-t border-[#24304a] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </div>

      </div>
    </div>
  );
};
