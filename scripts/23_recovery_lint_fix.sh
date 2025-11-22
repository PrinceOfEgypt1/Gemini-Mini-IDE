#!/usr/bin/env bash
set -e

echo "🚑 Iniciando Recuperação de Lint (Fase 5 Fix)..."

# 1. Atualizar eslint.config.mjs para permitir console na CLI
# -----------------------------------------------------
echo "📝 Ajustando regras do ESLint (Permitir console na CLI)..."
cat > eslint.config.mjs <<EOF
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignorar pastas de build e dependências
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  
  // Configurações globais
  { 
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: { 
      globals: { ...globals.node, ...globals.browser } 
    }
  },

  // Presets recomendados
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  // Regras globais
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },

  // Override específico para a CLI (Permite console.log e process.exit)
  {
    files: ["packages/cli/src/**/*.ts"],
    rules: {
      "no-console": "off",
      "no-process-exit": "off"
    }
  }
];
EOF

# 2. Corrigir packages/cli/src/index.ts (Remover 'any' e variáveis não usadas)
# -----------------------------------------------------
echo "📝 Corrigindo código da CLI..."
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
      } catch (_) {
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

# 3. Corrigir packages/ui/src/App.tsx (Remover variável 'error' não usada)
# -----------------------------------------------------
echo "📝 Corrigindo App.tsx (Fase 5 version)..."
# Nota: Estamos recriando a versão da Fase 5 limpa. 
# A Fase 6 será reaplicada no próximo passo.
cat > packages/ui/src/App.tsx <<EOF
import React, { useState } from 'react';
import axios from 'axios';
import { Play, Box, Zap, Paperclip, Send } from 'lucide-react';

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
      const response = await axios.post('/api/analyze', { text: userMsg.text });
      
      const agentMsg: Message = { 
        role: 'agent', 
        text: response.data.summary || 'Análise concluída.',
        timestamp: response.data.timestamp 
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      // Variável 'error' removida pois não era usada, satisfazendo o linter
      setMessages(prev => [...prev, { role: 'agent', text: 'Erro ao conectar com o servidor.', timestamp: new Date().toISOString() }]);
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
        <button className="btn"><Box size={16}/> Provisionar</button>
        <button className="btn primary"><Play size={16}/> Executar</button>
        <button className="btn"><Zap size={16}/> Quick Start</button>
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

echo "✅ Recuperação concluída: Lint corrigido e código limpo."
echo "👉 Execute ./42_pipeline_checklist.sh para confirmar que estamos no VERDE."
echo "👉 DEPOIS que estiver verde, eu fornecerei o script consolidado da Fase 6."
