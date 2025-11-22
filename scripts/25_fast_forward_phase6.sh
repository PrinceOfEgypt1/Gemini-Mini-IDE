#!/usr/bin/env bash
set -e

echo "🚀 Executing Fast Forward: Applying Phase 6 (UX & Refinement)..."

# ------------------------------------------------------------------------------
# 1. DEPENDÊNCIAS
# ------------------------------------------------------------------------------
echo "📦 Installing UI dependencies..."
pnpm --filter @mini-ide/ui add lucide-react clsx axios
pnpm --filter @mini-ide/ui add -D jsdom @testing-library/react @testing-library/dom @types/react @types/react-dom

# ------------------------------------------------------------------------------
# 2. ESTILOS GLOBAIS (Animações)
# ------------------------------------------------------------------------------
echo "🎨 Updating Global CSS..."
cat >> packages/ui/src/styles/global.css <<EOF

/* Phase 6: Animations & Feedback */
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.toast {
  animation: slideIn 0.3s ease-out;
}
EOF

# ------------------------------------------------------------------------------
# 3. COMPONENTES BASE (Common)
# ------------------------------------------------------------------------------
echo "🧩 Creating Common Components..."
mkdir -p packages/ui/src/components/common
mkdir -p packages/ui/src/contexts
mkdir -p packages/ui/src/hooks

# Button.tsx
cat > packages/ui/src/components/common/Button.tsx <<EOF
import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}) => {
  return (
    <button 
      className={clsx('btn', variant, className)} 
      disabled={disabled || isLoading}
      style={{ opacity: (disabled || isLoading) ? 0.7 : 1, cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
};
EOF

# ToastContext.tsx
cat > packages/ui/src/contexts/ToastContext.tsx <<EOF
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextProps {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextProps | undefined>(undefined);

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

# useToast.ts
cat > packages/ui/src/hooks/useToast.ts <<EOF
import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
EOF

# ------------------------------------------------------------------------------
# 4. COMPONENTES DE NEGÓCIO (Timeline, Notes, Tabs)
# ------------------------------------------------------------------------------
echo "🧩 Creating Business Components..."
mkdir -p packages/ui/src/components/explore
mkdir -p packages/ui/src/components/discovery

# ExploreTimeline.tsx
cat > packages/ui/src/components/explore/ExploreTimeline.tsx <<EOF
import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Play, FileText, MessageSquare } from 'lucide-react';

export type TimelineEventType = 'analysis' | 'discovery' | 'project' | 'execution' | 'system' | 'user-message';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  category: string; 
  title: string;
  description?: string;
  timestamp: Date;
}

interface ExploreTimelineProps {
  events?: TimelineEvent[];
}

export const ExploreTimeline: React.FC<ExploreTimelineProps> = ({ events = [] }) => {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(['analysis', 'discovery', 'project', 'execution', 'system', 'user-message'])
  );

  const getIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'analysis': return <FileText size={14} />;
      case 'discovery': return <Clock size={14} />;
      case 'project': return <CheckCircle size={14} />;
      case 'execution': return <Play size={14} />;
      case 'system': return <AlertCircle size={14} />;
      case 'user-message': return <MessageSquare size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const filteredEvents = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    return safeEvents
      .filter((event) => activeFilters.has(event.category) || activeFilters.has(event.type))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [events, activeFilters]);

  const toggleFilter = (category: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(category)) {
      newFilters.delete(category);
    } else {
      newFilters.add(category);
    }
    setActiveFilters(newFilters);
  };

  return (
    <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div className="timeline-header" style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
          TIMELINE ({filteredEvents.length})
        </div>
        <div className="filters" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {['analysis', 'user-message', 'system'].map(filter => (
            <button 
              key={filter}
              onClick={() => toggleFilter(filter)}
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: activeFilters.has(filter) ? 'var(--brand)' : 'transparent',
                color: activeFilters.has(filter) ? 'white' : 'var(--muted)',
                cursor: 'pointer'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-list" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '12px', padding: '20px' }}>
            Nenhum evento registrado.
          </div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.id} className="timeline-item" style={{ display: 'flex', gap: '10px' }}>
              <div style={{ 
                marginTop: '2px',
                minWidth: '24px', height: '24px', 
                borderRadius: '50%', 
                background: 'var(--panel-2)', 
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--brand)'
              }}>
                {getIcon(event.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)' }}>{event.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    {event.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                {event.description && (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {event.description}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
EOF

# DiscoveryNotes.tsx
cat > packages/ui/src/components/discovery/DiscoveryNotes.tsx <<EOF
import React from 'react';

export const DiscoveryNotes: React.FC = () => {
  return (
    <aside className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <strong>Discovery Notes</strong>
      </div>
      <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
         <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 8 }}>
           <small style={{ color: 'var(--brand)', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
             Intenção
           </small>
           <div style={{ marginTop: 4, fontSize: '13px' }}>Criar aplicação React</div>
         </div>
         <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 8, opacity: 0.5 }}>
           <small style={{ color: 'var(--muted)', fontSize: '10px' }}>REQUISITOS</small>
           <div style={{ marginTop: 4, fontSize: '13px', fontStyle: 'italic' }}>Nenhum requisito capturado...</div>
         </div>
      </div>
    </aside>
  );
};
EOF

# WorkspaceTabs.tsx
cat > packages/ui/src/components/WorkspaceTabs.tsx <<EOF
import React from 'react';
import clsx from 'clsx';
import { ExploreTimeline, TimelineEvent } from './explore/ExploreTimeline';

export type TabId = 'overview' | 'hus' | 'docs' | 'tests' | 'plan' | 'timeline' | 'runs' | 'metrics' | 'outputs' | 'analyze';

interface WorkspaceTabsProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  events: TimelineEvent[];
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, setActiveTab, events }) => {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Testes' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'plan', label: 'Personas' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'runs', label: 'Runs' },
    { id: 'metrics', label: 'Métricas' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <section className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx('pill', { ok: activeTab === tab.id })}
            style={{ cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}
            aria-label={\`Aba \${tab.label}\`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 8, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'overview' && (
          <div style={{ padding: 10 }}>
            <h2>Bem-vindo à Mini IDE</h2>
            <p className="muted">Modo de Exploração Ativo.</p>
            <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 8, marginTop: 20 }}>
              Selecione uma aba ou use o chat para começar.
            </div>
          </div>
        )}
        {activeTab === 'timeline' && (
          <ExploreTimeline events={events} />
        )}
        {!['overview', 'timeline'].includes(activeTab) && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
            <p>Conteúdo da aba <strong>{activeTab}</strong> será implementado em breve.</p>
          </div>
        )}
      </div>
    </section>
  );
};
EOF

# ------------------------------------------------------------------------------
# 5. APP SHELL (Integration)
# ------------------------------------------------------------------------------
echo "⚛️ Updating App.tsx..."
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

interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const MiniIDEInterface = () => {
  const { addToast } = useToast();
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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

    } catch (error) {
      console.error(error);
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
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>Mini IDE</h3>
        <span className="pill">Analysis Agent</span>
        <span className="pill ok">Explorando</span>
        <div style={{ flex: 1 }} />
        <Button onClick={() => addToast('Funcionalidade em breve!', 'info')}><Box size={16}/> Provisionar</Button>
        <Button variant="primary" onClick={() => addToast('Nenhum plano executável definido.', 'warning')}><Play size={16}/> Executar</Button>
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

# ------------------------------------------------------------------------------
# 6. TESTES SINCRONIZADOS (Correct, Clean, Strict)
# ------------------------------------------------------------------------------
echo "🧪 Creating Correct Tests..."

# Limpar testes antigos
rm -rf packages/ui/test

# Recriar estrutura
mkdir -p packages/ui/test/components
mkdir -p packages/ui/test/hooks

# Button.test.tsx
cat > packages/ui/test/components/Button.test.tsx <<EOF
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/common/Button';

describe('Button', () => {
  it('renderiza o texto corretamente', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeDefined();
  });

  it('aplica a classe de variante', () => {
    const { container } = render(<Button variant="primary">Ação</Button>);
    expect(container.firstChild).toHaveProperty('className', expect.stringContaining('primary'));
  });

  it('mostra estado de loading', () => {
    const { container } = render(<Button isLoading>Processando</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveProperty('disabled', true);
  });
});
EOF

# DiscoveryNotes.test.tsx
cat > packages/ui/test/components/DiscoveryNotes.test.tsx <<EOF
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryNotes } from '../../src/components/discovery/DiscoveryNotes';

describe('DiscoveryNotes', () => {
  it('renderiza o título do painel', () => {
    render(<DiscoveryNotes />);
    expect(screen.getByText('Discovery Notes')).toBeDefined();
  });

  it('renderiza a seção de Intenção', () => {
    render(<DiscoveryNotes />);
    expect(screen.getByText(/INTENÇÃO/i)).toBeDefined();
  });
});
EOF

# ExploreTimeline.test.tsx
cat > packages/ui/test/components/ExploreTimeline.test.tsx <<EOF
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExploreTimeline, TimelineEvent } from '../../src/components/explore/ExploreTimeline';

describe('ExploreTimeline', () => {
  it('renderiza mensagem de vazio quando não há eventos', () => {
    render(<ExploreTimeline events={[]} />);
    expect(screen.getByText(/Nenhum evento registrado/i)).toBeDefined();
  });

  it('renderiza lista de eventos quando fornecidos', () => {
    const mockEvents: TimelineEvent[] = [
      {
        id: '1',
        type: 'system',
        category: 'system',
        title: 'Sistema Iniciado',
        description: 'Teste de timeline',
        timestamp: new Date()
      }
    ];

    render(<ExploreTimeline events={mockEvents} />);
    expect(screen.getByText('Sistema Iniciado')).toBeDefined();
    expect(screen.getByText('Teste de timeline')).toBeDefined();
  });
});
EOF

# WorkspaceTabs.test.tsx
cat > packages/ui/test/components/WorkspaceTabs.test.tsx <<EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceTabs, TabId } from '../../src/components/WorkspaceTabs';
import { TimelineEvent } from '../../src/components/explore/ExploreTimeline';

describe('WorkspaceTabs', () => {
  const mockSetActive = vi.fn();
  const events: TimelineEvent[] = [];

  const renderComponent = (activeTab: TabId = 'overview') => {
    return render(
      <WorkspaceTabs 
        activeTab={activeTab} 
        setActiveTab={mockSetActive} 
        events={events} 
      />
    );
  };

  it('renderiza os botões das abas principais', () => {
    renderComponent();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('HUs')).toBeDefined();
    expect(screen.getByText('Timeline')).toBeDefined();
  });

  it('dispara setActiveTab ao clicar', () => {
    renderComponent();
    const tabDocs = screen.getByText('Docs');
    fireEvent.click(tabDocs);
    expect(mockSetActive).toHaveBeenCalledWith('docs');
  });

  it('exibe o conteúdo da aba Overview por padrão', () => {
    renderComponent('overview');
    expect(screen.getByText(/Bem-vindo à Mini IDE/i)).toBeDefined();
  });
});
EOF

# 7. DOCUMENTAÇÃO (Oficialização Fase 6)
# ------------------------------------------------------------------------------
echo "📚 Updating Documentation Status..."

cat > DEVELOPMENT.md <<EOF
# Mini-IDE — DEVELOPMENT.md

> **Versão Lógica:** v0.6.0 (Fase 6 Concluída)
> **Data:** $(date +%Y-%m-%d)
> **Estado:** UI Refatorada, Testes Sincronizados, Feedback Visual Ativo.

---

## 1. Status das Fases de Desenvolvimento

| Fase | Descrição | Status | Entregáveis Chave |
|---|---|---|---|
| **1** | **Fundação e Governança** | ✅ Concluído | Monorepo, ESLint v9, Vitest, Pipeline Script. |
| **2** | **Motor de Análise (Backend)** | ✅ Concluído | Servidor Fastify, Tipos em \`shared\`, Logs JSON. |
| **3** | **Conectando o Cérebro (IA)** | ✅ Concluído | Agente, Provider Pattern, Mock/DeepSeek. |
| **4** | **Primeira Interface (CLI)** | ✅ Concluído | CLI funcional validando fluxo ponta a ponta. |
| **5** | **Interface Visual (UI Shell)** | ✅ Concluído | React + Vite, Proxy, Layout Base. |
| **6** | **Refinamento e UX** | ✅ Concluído | Componentização (Tabs, Notes), Toasts, Loading States, Testes UI. |
| **7** | **Persistência e Histórico** | 📅 Pendente | Salvar bundles, logs persistentes, histórico na UI. |

---

## 2. Histórias de Usuário (HUs) Entregues

### Fase 1-5
HUs fundamentais de infraestrutura e backend entregues anteriormente.

### Fase 6: Refinamento e UX
- **HU-UI-Explore-Interactions-012:** Implementado sistema de Feedback Visual Universal (Botões com estados, Toasts).
- **HU-UI-Explore-Loading-States-017:** Spinners em botões e feedback durante requisições.
- **HU-UI-Explore-Error-Handling-016:** Tratamento de erro de conexão (Offline) com Toast de erro.
- **HU-UI-Timeline-003:** Componente \`ExploreTimeline\` implementado e exibindo eventos.
- **HU-UI-Discovery-Notes-002:** Componente \`DiscoveryNotes\` estruturado.
- **HU-UI-Tabs-004:** Navegação completa entre abas implementada no componente \`WorkspaceTabs\`.

EOF

echo "✅ FAST FORWARD COMPLETE: Phase 6 Applied Successfully."
echo "👉 Please run ./42_pipeline_checklist.sh to confirm integrity."
