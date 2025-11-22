#!/usr/bin/env bash
set -e

echo "🎨 Iniciando Fase 5: Construção da Interface Visual (React)..."

# 1. Instalar Dependências de UI
# -----------------------------------------------------
echo "📦 Instalando React, Vite e plugins..."
pnpm --filter @mini-ide/ui add react react-dom lucide-react axios clsx
pnpm --filter @mini-ide/ui add -D @vitejs/plugin-react vite @types/react @types/react-dom

# 2. Configuração do Vite
# -----------------------------------------------------
echo "⚙️ Configurando Vite..."

cat > packages/ui/vite.config.ts <<EOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redireciona chamadas /api para o backend local
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
EOF

# 3. Entry Point HTML
# -----------------------------------------------------
cat > packages/ui/index.html <<EOF
<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini IDE — Explore</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 4. Estilos Globais (Port do CSS do Wireframe)
# -----------------------------------------------------
mkdir -p packages/ui/src/styles
cat > packages/ui/src/styles/global.css <<EOF
:root {
  --bg: #0f1420;
  --panel: #141b2b;
  --panel-2: #101727;
  --panel-3: #0c1323;
  --text: #e6ecff;
  --muted: #9fb0d3;
  --brand: #4ba3ff;
  --brand-2: #6ad3ff;
  --accent: #00c2a8;
  --danger: #ff5c7a;
  --ok: #47e6a1;
  --chip: #222b40;
  --border: #24304a;
  --shadow: 0 8px 24px rgba(0,0,0,.35);
  --radius: 14px;
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}

* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
}

#root { height: 100vh; display: flex; flex-direction: column; }

/* Utilitários de Layout baseados no wireframe */
.app-grid { display: grid; grid-template-rows: 56px 1fr 126px; height: 100%; }
.main-area { display: grid; grid-template-columns: 280px 1fr 360px; gap: 14px; padding: 14px; overflow: hidden; }

/* Componentes Base */
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; }
.btn { background: var(--panel-2); border: 1px solid var(--border); color: var(--text); height: 32px; padding: 0 12px; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-family: inherit; }
.btn:hover { border-color: var(--brand); }
.btn.primary { background: linear-gradient(180deg, var(--brand-2), var(--brand)); color: white; border: none; }
.pill { padding: 4px 10px; border-radius: 999px; background: var(--chip); border: 1px solid var(--border); color: var(--muted); font-size: 12px; }
.pill.ok { color: var(--ok); background: rgba(71, 230, 161, 0.15); border-color: rgba(71, 230, 161, 0.4); }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }
EOF

# 5. Implementação React
# -----------------------------------------------------
echo "⚛️ Criando componentes React..."

mkdir -p packages/ui/src/components

# --- Main Entry ---
cat > packages/ui/src/main.tsx <<EOF
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# --- App Shell ---
cat > packages/ui/src/App.tsx <<EOF
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
EOF

# 6. Atualizar tsconfig.json da UI para incluir JSX
cat > packages/ui/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"]
}
EOF

echo "✅ Fase 5 concluída: Frontend React criado!"
echo "👉 Para testar a UI:"
echo "   1. Mantenha o servidor rodando em um terminal (pnpm --filter @mini-ide/server start)"
echo "   2. Em outro terminal, inicie a UI: pnpm --filter @mini-ide/ui dev"
echo "   3. Abra http://localhost:5173 no navegador."
