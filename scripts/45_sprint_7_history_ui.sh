#!/usr/bin/env bash
set -e

echo "💾 Sprint 7.12: Implementando Histórico e Logs Persistentes..."

# ------------------------------------------------------------------------------
# 1. BACKEND: Listagem de Histórico e Logs em Arquivo
# ------------------------------------------------------------------------------
echo "⚙️ Atualizando @mini-ide/server..."

# Instalar pino-roll para rotação de logs em arquivo
pnpm --filter @mini-ide/server add pino-roll

cat > packages/server/src/services/persistence.ts <<EOF
import fs from 'fs/promises';
import path from 'path';
import { AnalyzeResponse } from '@mini-ide/shared';

export interface HistoryItem {
  filename: string;
  timestamp: string;
  requestId: string;
  summary: string;
}

export class PersistenceService {
  private baseDir: string;

  constructor(baseDir: string = 'bundles') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de bundles:', error);
    }
  }

  async saveBundle(data: AnalyzeResponse): Promise<string> {
    const dateFolder = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.baseDir, dateFolder);
    await fs.mkdir(targetDir, { recursive: true });
    const filename = \`\${data.timestamp.replace(/:/g, '-')}-\${data.requestId}.json\`;
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  // NOVO: Listar histórico
  async listHistory(): Promise<HistoryItem[]> {
    const items: HistoryItem[] = [];
    try {
      // Lê pastas de data (ex: 2023-10-27)
      const days = await fs.readdir(this.baseDir);
      for (const day of days) {
        const dayPath = path.join(this.baseDir, day);
        const stat = await fs.stat(dayPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(dayPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          // Lê apenas o início do arquivo para performance (ou lê tudo se for pequeno)
          const content = await fs.readFile(path.join(dayPath, file), 'utf-8');
          try {
            const json = JSON.parse(content) as AnalyzeResponse;
            items.push({
              filename: file,
              timestamp: json.timestamp,
              requestId: json.requestId,
              summary: json.summary
            });
          } catch (e) { /* Ignora arquivos corrompidos */ }
        }
      }
      // Ordena do mais recente para o mais antigo
      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      return [];
    }
  }
}
EOF

# Atualizar index.ts do servidor para usar pino-roll e expor rota GET /analyze/history
cat > packages/server/src/index.ts <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { AnalysisAgent } from '@mini-ide/analysis-agent';
import { PersistenceService } from './services/persistence.js';
import path from 'path';

const PORT = Number(process.env.PORT) || 3200;
const agent = new AnalysisAgent();
const persistence = new PersistenceService();

const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      targets: [
        { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } },
        { 
          target: 'pino-roll', 
          options: { 
            file: path.join(process.cwd(), 'logs', 'audit.log'),
            size: '10m',
            interval: '1d',
            mkdir: true
          } 
        }
      ]
    }
  }
});

fastify.register(cors, { origin: true });

fastify.get('/healthz', async () => {
  return { status: 'ok', uptime: process.uptime() };
});

// NOVA ROTA: Histórico
fastify.get('/analyze/history', async () => {
  const history = await persistence.listHistory();
  return history;
});

fastify.post<{ Body: AnalyzeRequest; Reply: AnalyzeResponse | { error: string } }>('/analyze', async (request, reply) => {
  const { text } = request.body;
  if (!text || text.trim().length === 0) return reply.code(400).send({ error: 'Text is required' });

  request.log.info({ msg: 'Iniciando análise', inputLength: text.length });

  try {
    const response = await agent.process(request.body);
    persistence.saveBundle(response)
      .then((path) => request.log.info({ msg: 'Bundle salvo', path }))
      .catch((err) => request.log.error({ msg: 'Erro ao salvar bundle', err }));
    return response;
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Processing Error' });
  }
});

const start = async () => {
  try {
    await persistence.init();
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(\`🚀 Mini-IDE Server rodando em http://localhost:\${PORT}\`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
EOF

# ------------------------------------------------------------------------------
# 2. FRONTEND: Componente HistoryPanel
# ------------------------------------------------------------------------------
echo "🎨 Criando HistoryPanel na UI..."
mkdir -p packages/ui/src/components/analyze

cat > packages/ui/src/components/analyze/HistoryPanel.tsx <<EOF
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, FileText } from 'lucide-react';

interface HistoryItem {
  filename: string;
  timestamp: string;
  requestId: string;
  summary: string;
}

export const HistoryPanel: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/analyze/history');
      setHistory(res.data);
    } catch (e) {
      console.error('Erro ao carregar histórico', e);
    } finally {
      setLoading(false);
    }
  };

  // Carrega ao montar
  useEffect(() => {
    fetchHistory();
    // Polling simples a cada 10s para atualizar
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && history.length === 0) return <div className="muted" style={{padding: 20}}>Carregando histórico...</div>;
  if (history.length === 0) return <div className="muted" style={{padding: 20}}>Nenhuma execução registrada.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map(item => (
        <div key={item.requestId} style={{ 
          background: 'var(--panel-3)', 
          padding: 10, 
          borderRadius: 8,
          border: '1px solid var(--border)',
          cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '11px', color: 'var(--brand)', display: 'flex', gap: 4, alignItems: 'center' }}>
               <Clock size={10}/> {new Date(item.timestamp).toLocaleString()}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>ID: {item.requestId.slice(0,6)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <FileText size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: '13px', color: 'var(--text)' }}>{item.summary}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
EOF

# 3. Integrar na Aba 'Runs'
# ------------------------------------------------------------------------------
echo "⚛️ Atualizando WorkspaceTabs para mostrar HistoryPanel..."

# Reescreve WorkspaceTabs para importar e usar o HistoryPanel na aba 'runs'
cat > packages/ui/src/components/WorkspaceTabs.tsx <<EOF
import React from 'react';
import clsx from 'clsx';
import { ExploreTimeline, TimelineEvent } from './explore/ExploreTimeline';
import { HistoryPanel } from './analyze/HistoryPanel';

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

        {/* Aba Runs agora mostra o Histórico Real */}
        {activeTab === 'runs' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
             <h3 style={{ marginTop: 0 }}>Histórico de Execuções</h3>
             <HistoryPanel />
          </div>
        )}

        {!['overview', 'timeline', 'runs'].includes(activeTab) && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
            <p>Conteúdo da aba <strong>{activeTab}</strong> será implementado em breve.</p>
          </div>
        )}
      </div>
    </section>
  );
};
EOF

# 4. Rebuild do Server (para pegar dependências novas)
# ------------------------------------------------------------------------------
echo "🏗️ Reconstruindo Server..."
pnpm --filter @mini-ide/server build

echo "✅ Sprint 7.12 Concluída: Histórico e Logs implementados."
echo "👉 Execute ./42_pipeline_checklist.sh para validar."
