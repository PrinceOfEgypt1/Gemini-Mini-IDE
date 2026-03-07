#!/usr/bin/env bash
set -e

echo "🧙‍♂️ Iniciando Sprint 10.3: Interface do Wizard de Criação..."

# 1. Garantir que os tipos compartilhados estejam construídos
echo "🏗️ Reconstruindo Shared para garantir tipos..."
pnpm --filter @mini-ide/shared build

# 2. Criar o Componente Wizard
# -----------------------------------------------------
echo "🧩 Criando packages/ui/src/components/wizard/ProjectWizard.tsx..."
mkdir -p packages/ui/src/components/wizard

cat > packages/ui/src/components/wizard/ProjectWizard.tsx <<EOF
import React, { useState } from 'react';
import axios from 'axios';
import { X, ChevronRight, Check, Download, Loader2, Code } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../../hooks/useToast';
import { UserStory, ProjectDefinition, GeneratedScripts } from '@mini-ide/shared';

interface ProjectWizardProps {
  onClose: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ onClose }) => {
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Estado do Fluxo
  const [intention, setIntention] = useState('');
  const [hus, setHus] = useState<UserStory[]>([]);
  const [config, setConfig] = useState({ name: '', path: '', stack: 'react' });
  const [scripts, setScripts] = useState<GeneratedScripts | null>(null);

  // Passo 1 -> 2: Gerar HUs
  const handleDiscovery = async () => {
    if (!intention.trim()) return addToast('Descreva o que você quer construir.', 'warning');
    
    setLoading(true);
    try {
      const res = await axios.post('/api/discovery/hus', { intention });
      setHus(res.data.userStories);
      setStep(2);
    } catch (error) {
        console.error(error); // Log para debug
        addToast('Erro ao gerar HUs. Verifique o backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Passo 2 -> 3: Confirmar Configuração
  const handleConfirmConfig = () => {
    if (!config.name || !config.path) return addToast('Preencha todos os campos.', 'warning');
    setStep(3);
    handleGenerateScripts(); // Auto dispara geração ao entrar no passo 3
  };

  // Passo 3: Gerar Scripts Finais
  const handleGenerateScripts = async () => {
    setLoading(true);
    const projectDef: ProjectDefinition = {
      name: config.name,
      path: config.path,
      stack: config.stack,
      userStories: hus
    };

    try {
      const res = await axios.post('/api/wizard/generate', projectDef);
      setScripts(res.data);
    } catch (error) {
        console.error(error);
        addToast('Erro ao gerar scripts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadScript = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addToast(\`Download de \${filename} iniciado.\`, 'success');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="panel" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--panel)' }}>
        
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Novo Projeto (Passo {step}/3)</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer' }}><X /></button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* PASSO 1: INTENÇÃO */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>O que você deseja construir?</label>
              <textarea 
                value={intention}
                onChange={e => setIntention(e.target.value)}
                placeholder="Ex: Quero uma API em Node.js para gerenciar tarefas..."
                style={{ 
                  width: '100%', height: '120px', padding: '12px', 
                  background: 'var(--panel-2)', border: '1px solid var(--border)', 
                  color: 'var(--text)', borderRadius: '8px' 
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={handleDiscovery} isLoading={loading}>
                  Analisar e Gerar HUs <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 2: REVISÃO E CONFIG */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0 }}>Histórias de Usuário Propostas ({hus.length})</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                  {hus.map(hu => (
                    <li key={hu.id}><strong>{hu.id}:</strong> {hu.title}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Nome do Projeto</label>
                  <input 
                    value={config.name}
                    onChange={e => setConfig({...config, name: e.target.value})}
                    style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>Stack</label>
                  <select 
                    value={config.stack}
                    onChange={e => setConfig({...config, stack: e.target.value})}
                    style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                  >
                    <option value="react">React + Vite</option>
                    <option value="node">Node.js API</option>
                    <option value="python">Python Script</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px' }}>Caminho Local (Onde criar)</label>
                <input 
                  value={config.path}
                  placeholder="/home/user/projects/meu-app"
                  onChange={e => setConfig({...config, path: e.target.value})}
                  style={{ width: '100%', padding: '8px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '6px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                 <Button onClick={() => setStep(1)}>Voltar</Button>
                 <Button variant="primary" onClick={handleConfirmConfig}>Gerar Scripts <Check size={16}/></Button>
              </div>
            </div>
          )}

          {/* PASSO 3: DOWNLOAD */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              {loading ? (
                <div style={{ padding: '40px' }}><Loader2 className="animate-spin" size={32} /> <p>Gerando engenharia...</p></div>
              ) : scripts ? (
                <>
                  <div style={{ background: 'rgba(71, 230, 161, 0.1)', color: 'var(--ok)', padding: '16px', borderRadius: '8px' }}>
                    <h4>Tudo pronto!</h4>
                    <p>Os scripts de criação foram gerados.</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <Button onClick={() => downloadScript('setup.sh', scripts.setupScript)}>
                      <Download size={16}/> Baixar setup.sh
                    </Button>
                    <Button onClick={() => downloadScript('pipeline.sh', scripts.pipelineScript)}>
                      <Download size={16}/> Baixar pipeline.sh
                    </Button>
                  </div>

                  <div style={{ textAlign: 'left', background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    <p style={{ color: 'var(--muted)' }}># Instruções:</p>
                    <p>{scripts.instructions}</p>
                  </div>
                  
                  <Button onClick={onClose} style={{ marginTop: '20px' }}>Fechar</Button>
                </>
              ) : (
                <p>Erro na geração.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
EOF

# 3. Integrar no App.tsx
# -----------------------------------------------------
echo "⚛️ Integrando Wizard no App.tsx..."

cat > packages/ui/src/App.tsx <<EOF
import { useState } from 'react';
import axios from 'axios';
import { Play, Box, Zap, Paperclip, Send, Loader2 } from 'lucide-react';
import { ToastProvider } from './contexts/ToastContext';
import { useToast } from './hooks/useToast';
import { Button } from './components/common/Button';
import { TimelineEvent } from './components/explore/ExploreTimeline';
import { WorkspaceTabs, TabId } from './components/WorkspaceTabs';
import { DiscoveryNotes } from './components/discovery/DiscoveryNotes';
import { ProjectWizard } from './components/wizard/ProjectWizard';

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const MiniIDEInterface = () => {
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showWizard, setShowWizard] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Olá! Estou pronto para explorar o projeto. O que vamos construir?', timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const now = new Date();
    const userMsg: Message = { role: 'user', text: input, timestamp: now.toISOString() };
    
    setMessages(prev => [...prev, userMsg]);
    setEvents(prev => [{
        id: Math.random().toString(36),
        type: 'user-message',
        category: 'user-message',
        title: 'Mensagem enviada',
        description: input.substring(0, 30) + (input.length > 30 ? '...' : ''),
        timestamp: now
    }, ...prev]);

    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/analyze', { text: userMsg.text });
      
      const agentMsg: Message = { 
        role: 'agent', 
        text: response.data.summary || 'Análise concluída.',
        timestamp: response.data.timestamp 
      };
      setMessages(prev => [...prev, agentMsg]);
      
      setEvents(prev => [{
        id: Math.random().toString(36),
        type: 'analysis',
        category: 'analysis',
        title: 'Análise concluída',
        description: 'Resposta recebida do agente',
        timestamp: new Date()
      }, ...prev]);

    } catch {
      addToast('Erro ao conectar com o servidor. Verifique se o backend está rodando.', 'error');
      setMessages(prev => [...prev, { role: 'agent', text: '❌ Falha na comunicação.', timestamp: new Date().toISOString() }]);
      
      setEvents(prev => [{
        id: Math.random().toString(36),
        type: 'system',
        category: 'system',
        title: 'Erro de conexão',
        description: 'Falha ao contatar servidor',
        timestamp: new Date()
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-grid">
      {showWizard && <ProjectWizard onClose={() => setShowWizard(false)} />}

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>Mini IDE</h3>
        <span className="pill">Analysis Agent</span>
        <span className="pill ok">Explorando</span>
        <div style={{ flex: 1 }} />
        {/* Botão Criar Projeto agora abre o Wizard */}
        <Button onClick={() => setShowWizard(true)} variant="primary"><Box size={16}/> Criar Projeto</Button>
        <Button onClick={() => addToast('Nenhum plano executável definido.', 'warning')}><Play size={16}/> Executar</Button>
        <Button onClick={() => addToast('Iniciando tour...', 'info')}><Zap size={16}/> Quick Start</Button>
      </header>

      <div className="main-area">
        <aside className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong>Projeto</strong>
            <span className="pill ok">v1.0</span>
          </div>
          <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 8, padding: 10, color: 'var(--muted)' }}>
            src/<br/>&nbsp; main.tsx<br/>&nbsp; App.tsx
          </div>
        </aside>

        <WorkspaceTabs activeTab={activeTab} setActiveTab={setActiveTab} events={events} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <DiscoveryNotes />
            
            <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>
                    CHAT DO AGENTE
                </div>
                <div style={{ flex: 1, padding: 10, overflowY: 'auto' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ 
                    marginBottom: 8, 
                    padding: 8, 
                    borderRadius: 8, 
                    background: m.role === 'user' ? 'var(--panel-3)' : 'rgba(75,163,255,0.1)',
                    color: m.role === 'user' ? 'var(--text)' : 'var(--brand-2)'
                    }}>
                    <strong>{m.role === 'user' ? 'Você' : 'Agente'}:</strong> {m.text}
                    </div>
                ))}
                {loading && <div className="muted" style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 className="animate-spin" size={14}/> Processando...</div>}
                </div>
            </div>
        </div>
      </div>

      <footer style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)', padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <textarea 
          placeholder="Digite sua ideia..." 
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          style={{ 
            background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, 
            color: 'var(--text)', padding: 10, resize: 'none', outline: 'none', opacity: loading ? 0.5 : 1
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button><Paperclip size={16}/></Button>
          <Button variant="primary" onClick={handleSend} isLoading={loading}><Send size={16}/></Button>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <MiniIDEInterface />
    </ToastProvider>
  );
}
EOF

# 4. Testes Básicos do Wizard
# -----------------------------------------------------
echo "🧪 Criando teste para ProjectWizard..."
mkdir -p packages/ui/test/components/wizard

cat > packages/ui/test/components/wizard/ProjectWizard.test.tsx <<EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectWizard } from '../../../src/components/wizard/ProjectWizard';
import { ToastProvider } from '../../../src/contexts/ToastContext';
import React from 'react';

describe('ProjectWizard', () => {
  const mockClose = vi.fn();

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ProjectWizard onClose={mockClose} />
      </ToastProvider>
    );
  };

  it('renderiza o título do passo 1', () => {
    renderComponent();
    expect(screen.getByText(/Novo Projeto \(Passo 1\/3\)/i)).toBeDefined();
  });

  it('mostra o campo de intenção', () => {
    renderComponent();
    expect(screen.getByText('O que você deseja construir?')).toBeDefined();
  });
});
EOF

echo "✅ Sprint 10.3 Concluída: Wizard UI implementado."
echo "👉 Execute ./42_pipeline_checklist.sh para validar."
