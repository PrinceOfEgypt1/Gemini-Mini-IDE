import React from 'react';
import Markdown from 'react-markdown';
import { Button } from '../common/Button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MANUAL_CONTENT = `
# Manual do Gemini Mini-IDE

Bem-vindo! O Gemini Mini-IDE é um **Agente de Engenharia de Software** projetado para transformar ideias em código estruturado.

## 🚀 Como Funciona

O fluxo de trabalho é dividido em 3 etapas principais:

1.  **Exploração (Chat):**
    - Converse com o agente. Descreva sua ideia ("Quero um sistema de login").
    - O agente coleta requisitos automaticamente no painel **Discovery Notes**.
    
2.  **Planejamento (Abas):**
    - O agente gera Histórias de Usuário (HUs) e Documentação Técnica.
    - Você pode revisar tudo nas abas **HUs**, **Docs** e **Timeline**.

3.  **Materialização (Exportação):**
    - Quando estiver satisfeito, clique em **Exportar Projeto (.zip)** na aba **Outputs**.
    - Você receberá o código completo para rodar na sua máquina.

## ⚠️ Limitações Importantes

- **Ambiente Local:** O Gemini Mini-IDE roda no seu navegador e servidor local. Ela não faz deploy automático na nuvem (AWS, Vercel, etc).
- **Contexto:** O agente lembra da conversa atual, mas se você recarregar a página (F5) sem exportar, o contexto da memória do agente será reiniciado (embora as configurações fiquem salvas).
- **Segurança:** Sua API Key é salva apenas no seu navegador. Nós nunca a armazenamos em nossos servidores.

## 💡 Dicas de Prompt

- Seja específico: *"Quero uma API em Node.js com Fastify"* é melhor que *"Quero um backend"*.
- Peça testes: *"Inclua testes unitários com Vitest"*.
`;

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[600px] max-w-full flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727] rounded-t-xl">
          <h2 className="text-[#e6ecff] font-bold text-lg flex items-center gap-2">
            <span className="bg-[#4ba3ff]/20 text-[#4ba3ff] p-1 rounded text-xs">?</span> 
            Manual do Usuário
          </h2>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white transition-colors">✕</button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto text-[#e6ecff] leading-relaxed prose prose-invert prose-sm max-w-none">
          {/* Estilização customizada para o Markdown via Tailwind Typography ou CSS manual */}
          <div className="markdown-body">
            <Markdown>{MANUAL_CONTENT}</Markdown>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#24304a] bg-[#101727] rounded-b-xl flex justify-end">
          <Button variant="primary" onClick={onClose}>Entendi</Button>
        </div>

      </div>
    </div>
  );
};
