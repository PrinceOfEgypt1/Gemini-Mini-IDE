#!/usr/bin/env bash
set -e

echo "🚑 Iniciando Hotfix de Lint (Fase 6)..."

# 1. Corrigir ToastContext.tsx
# Problema: Comentário eslint-disable referenciando regra inexistente.
# Solução: Remover a primeira linha.
# -----------------------------------------------------
echo "📝 Corrigindo ToastContext.tsx..."
cat > packages/ui/src/contexts/ToastContext.tsx <<EOF
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

# 2. Corrigir App.tsx
# Problema: console.error não permitido.
# Solução: Remover console.error e manter apenas o Toast e a atualização de estado.
# -----------------------------------------------------
echo "📝 Corrigindo App.tsx..."
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

# 3. Corrigir CLI index.ts
# Problema: Variável não usada no catch.
# Solução: Usar optional catch binding.
# -----------------------------------------------------
echo "📝 Corrigindo CLI..."
cat > packages/cli/src/index.ts <<EOF
#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import ora from 'ora';

// URL do servidor (padrão local)
const SERVER_URL = process.env.MINI_IDE_SERVER_URL || 'http://localhost:3200';

const program = new Command();

program
  .name('mini-ide')
  .description('CLI para o Mini-IDE - Ambiente de Desenvolvimento Assistido por IA')
  .version('0.0.1');

program
  .command('analyze')
  .description('Envia um arquivo ou texto para análise do agente')
  .argument('<input>', 'Caminho do arquivo ou string de texto')
  .option('-m, --max-len <number>', 'Tamanho máximo do resumo', '200')
  .option('--raw', 'Trata o input como texto puro, não arquivo')
  .action(async (input, options) => {
    let content = input;
    
    // Se não for modo raw, tenta ler como arquivo
    if (!options.raw) {
      try {
        const filePath = path.resolve(process.cwd(), input);
        // Verifica se arquivo existe
        await fs.access(filePath);
        content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.blue(\`📄 Lendo arquivo: \${filePath}\`));
      } catch {
        // Se falhar, assume que é texto se não for muito longo, ou erro
        if (input.length < 255 && !input.includes('\n')) {
           console.log(chalk.yellow('⚠️  Arquivo não encontrado. Tratando como texto direto.'));
           content = input;
        } else {
           console.error(chalk.red('❌ Erro: Arquivo não encontrado e input inválido.'));
           process.exit(1);
        }
      }
    }

    const spinner = ora('Enviando para o Agente de Análise...').start();

    try {
      const response = await axios.post(\`\${SERVER_URL}/analyze\`, {
        text: content,
        maxLen: parseInt(options.maxLen)
      });

      spinner.succeed(chalk.green('Análise concluída!'));
      
      const data = response.data;
      
      console.log('\n' + chalk.bold('📊 Resultado da Análise:'));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.white(data.summary));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.cyan(\`ID: \${data.requestId}\`));
      console.log(chalk.dim(\`Tokens (Simulado): Entrou \${data.inputLength} / Saiu \${data.outputLength}\`));

    } catch (error) {
      spinner.fail(chalk.red('Falha na análise.'));
      
      const err = error as AxiosError | Error;

      if ('code' in err && err.code === 'ECONNREFUSED') {
        console.error(chalk.red(\`\n❌ Não foi possível conectar ao servidor em \${SERVER_URL}.\`));
        console.error(chalk.yellow('Dica: O servidor está rodando? (pnpm start no pacote server)'));
      } else {
        console.error(chalk.red(\`Erro: \${err.message}\`));
        if (axios.isAxiosError(err) && err.response) {
            console.error(chalk.dim(JSON.stringify(err.response.data)));
        }
      }
      process.exit(1);
    }
  });

program.parse();
EOF

echo "✅ Hotfix 6.7 aplicado! Arquivos limpos."
echo "👉 Execute ./42_pipeline_checklist.sh para confirmar."
