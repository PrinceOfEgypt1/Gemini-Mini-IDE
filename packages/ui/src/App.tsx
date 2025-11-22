import React, { useState } from 'react';
import axios from 'axios';
import { Play, Box, Zap, Paperclip, Send } from 'lucide-react';

// Interfaces locais (idealmente viriam do @mini-ide/shared)
interface Message {
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export default function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Olá! Estou pronto para explorar o projeto. O que vamos construir?', timestamp: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Chama o backend (via proxy do Vite)
      const response = await axios.post('/api/analyze', { text: userMsg.text });
      
      const agentMsg: Message = { 
        role: 'agent', 
        text: response.data.summary || 'Análise concluída.',
        timestamp: response.data.timestamp 
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', text: 'Erro ao conectar com o servidor.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-grid">
      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>Mini IDE</h3>
        <span className="pill">Analysis Agent</span>
        <span className="pill ok">Explorando</span>
        <div style={{ flex: 1 }} />
        <button className="btn"><Box size={16}/> Provisionar</button>
        <button className="btn primary"><Play size={16}/> Executar</button>
        <button className="btn"><Zap size={16}/> Quick Start</button>
      </header>

      {/* MAIN CONTENT */}
      <div className="main-area">
        {/* Coluna 1: Sidebar */}
        <aside className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <strong>Projeto</strong>
            <span className="pill ok">v1.0</span>
          </div>
          <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 8, padding: 10, color: 'var(--muted)' }}>
            src/<br/>&nbsp; main.tsx<br/>&nbsp; App.tsx
          </div>
        </aside>

        {/* Coluna 2: Workspace Tabs */}
        <section className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="pill ok" style={{ cursor: 'pointer' }}>Overview</button>
            <button className="pill" style={{ cursor: 'pointer' }}>HUs</button>
            <button className="pill" style={{ cursor: 'pointer' }}>Docs</button>
          </div>
          <div style={{ flex: 1, background: 'var(--panel-2)', borderRadius: 8, padding: 20 }}>
            <h2>Bem-vindo à Mini IDE</h2>
            <p className="muted">Modo de Exploração Ativo.</p>
            <div style={{ padding: 20, border: '1px dashed var(--border)', borderRadius: 8, marginTop: 20 }}>
              As HUs e planos gerados aparecerão aqui após a análise.
            </div>
          </div>
        </section>

        {/* Coluna 3: Chat & Discovery */}
        <aside className="panel">
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <strong>Discovery Notes</strong>
          </div>
          <div style={{ flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
             <div style={{ background: 'var(--panel-2)', padding: 10, borderRadius: 8 }}>
               <small style={{ color: 'var(--brand)' }}>INTENÇÃO</small>
               <div>Criar aplicação React</div>
             </div>
          </div>
          
          <div style={{ flex: 1, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
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
               {loading && <div className="muted" style={{ padding: 8 }}>Digitando...</div>}
             </div>
          </div>
        </aside>
      </div>

      {/* FOOTER */}
      <footer style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)', padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
        <textarea 
          placeholder="Digite sua ideia..." 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          style={{ 
            background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 10, 
            color: 'var(--text)', padding: 10, resize: 'none', outline: 'none' 
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn"><Paperclip size={16}/></button>
          <button className="btn primary" onClick={handleSend} disabled={loading}><Send size={16}/></button>
        </div>
      </footer>
    </div>
  )
}
