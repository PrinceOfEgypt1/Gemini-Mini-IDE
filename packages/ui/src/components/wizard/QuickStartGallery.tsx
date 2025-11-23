import React from 'react';
import { Button } from '../Button';

interface QuickStartGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
  onStartTour: () => void;
}

export const QuickStartGallery: React.FC<QuickStartGalleryProps> = ({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  onStartTour 
}) => {
  if (!isOpen) return null;

  const templates = [
    {
      icon: '🌐',
      title: 'API REST Node.js',
      desc: 'Servidor Fastify com TypeScript, Swagger e testes.',
      prompt: 'Quero criar uma API REST usando Node.js, Fastify e TypeScript. Preciso de endpoints para usuários (CRUD), documentação com Swagger e testes unitários com Vitest.'
    },
    {
      icon: '⚛️',
      title: 'React Dashboard',
      desc: 'SPA moderna com Vite, Tailwind e gráficos.',
      prompt: 'Quero criar um Dashboard administrativo usando React, Vite e TailwindCSS. Preciso de uma sidebar responsiva, modo escuro e um gráfico de exemplo.'
    },
    {
      icon: '🐍',
      title: 'Script Python',
      desc: 'Automação de dados com Pandas.',
      prompt: 'Quero um script Python para ler um arquivo CSV, filtrar linhas com erros e gerar um relatório resumido em JSON.'
    },
    {
      icon: '🏗️',
      title: 'Microserviço Go',
      desc: 'API de alta performance com Docker.',
      prompt: 'Quero criar um microserviço em Go (Golang) que exponha uma rota de healthcheck e uma rota de processamento, incluindo Dockerfile otimizado.'
    }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[700px] max-w-[95vw] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#24304a] flex justify-between items-center bg-[#101727] rounded-t-xl">
          <div>
            <h2 className="text-[#e6ecff] font-bold text-xl">Como você quer começar?</h2>
            <p className="text-[#9fb0d3] text-sm mt-1">Escolha um ponto de partida ou faça um tour.</p>
          </div>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          
          {/* Tour Banner */}
          <div className="bg-gradient-to-r from-[#4ba3ff]/10 to-[#4ba3ff]/5 border border-[#4ba3ff]/20 rounded-lg p-4 flex items-center justify-between mb-8">
            <div className="flex gap-3 items-center">
              <div className="bg-[#4ba3ff]/20 p-2 rounded-full text-xl">🎓</div>
              <div>
                <h3 className="text-[#e6ecff] font-semibold">Novo na Mini-IDE?</h3>
                <p className="text-[#9fb0d3] text-xs">Faça um tour guiado para conhecer as ferramentas.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { onClose(); onStartTour(); }}>
              Iniciar Tour
            </Button>
          </div>

          {/* Templates Grid */}
          <h3 className="text-[#e6ecff] font-medium mb-4 text-sm uppercase tracking-wider opacity-80">Templates Populares</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t, idx) => (
              <button 
                key={idx}
                onClick={() => { onSelectTemplate(t.prompt); onClose(); }}
                className="flex flex-col items-start p-4 bg-[#0f1420] border border-[#24304a] rounded-lg hover:border-[#4ba3ff] hover:bg-[#1a2335] transition-all text-left group"
              >
                <div className="flex justify-between w-full mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
                  <span className="text-[#4ba3ff] opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">Usar →</span>
                </div>
                <strong className="text-[#e6ecff] font-medium mb-1">{t.title}</strong>
                <p className="text-[#9fb0d3] text-xs leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
