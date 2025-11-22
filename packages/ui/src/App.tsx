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
