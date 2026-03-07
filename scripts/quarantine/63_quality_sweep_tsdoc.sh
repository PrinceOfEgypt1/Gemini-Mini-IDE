#!/usr/bin/env bash
set -e

echo "🧹 Sprint 8.9: Varredura de Qualidade e TSDoc (UI & CLI)..."

# ------------------------------------------------------------------------------
# 1. Documentando CLI (@mini-ide/cli)
# ------------------------------------------------------------------------------
echo "📝 Aplicando TSDoc na CLI..."
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

/**
 * Inicializa a ferramenta de linha de comando (CLI) do Mini-IDE.
 * Utiliza a biblioteca 'commander' para gerenciar argumentos e opções.
 */
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

# ------------------------------------------------------------------------------
# 2. Documentando UI Components (@mini-ide/ui)
# ------------------------------------------------------------------------------
echo "📝 Aplicando TSDoc nos Componentes de UI..."

# ExploreTimeline.tsx
cat > packages/ui/src/components/explore/ExploreTimeline.tsx <<EOF
import React, { useMemo, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Play, FileText, MessageSquare } from 'lucide-react';

/** Tipos de eventos suportados na timeline de exploração. */
export type TimelineEventType = 'analysis' | 'discovery' | 'project' | 'execution' | 'system' | 'user-message';

/**
 * Representa um evento individual na linha do tempo.
 */
export interface TimelineEvent {
  /** ID único do evento. */
  id: string;
  /** Tipo do evento para renderização de ícone. */
  type: TimelineEventType;
  /** Categoria para filtragem (geralmente igual ao tipo, mas pode agrupar). */
  category: string; 
  /** Título curto do evento. */
  title: string;
  /** Descrição detalhada ou subtítulo opcional. */
  description?: string;
  /** Data e hora da ocorrência. */
  timestamp: Date;
}

/**
 * Propriedades do componente ExploreTimeline.
 */
interface ExploreTimelineProps {
  /** Lista de eventos a serem exibidos. Se omitido, exibe estado vazio. */
  events?: TimelineEvent[];
}

/**
 * Componente que exibe uma lista cronológica de eventos da sessão.
 * Inclui funcionalidades de filtragem por categoria e ordenação automática (mais recente primeiro).
 */
export const ExploreTimeline: React.FC<ExploreTimelineProps> = ({ events = [] }) => {
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(['analysis', 'discovery', 'project', 'execution', 'system', 'user-message'])
  );

  /**
   * Retorna o ícone correspondente ao tipo de evento.
   */
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

  // Filtra e ordena os eventos (Memoizado para performance)
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

# WorkspaceTabs.tsx
cat > packages/ui/src/components/WorkspaceTabs.tsx <<EOF
import React from 'react';
import clsx from 'clsx';
import { ExploreTimeline, TimelineEvent } from './explore/ExploreTimeline';
import { HistoryPanel } from './analyze/HistoryPanel';

/** Identificadores únicos para as abas do workspace. */
export type TabId = 'overview' | 'hus' | 'docs' | 'tests' | 'plan' | 'timeline' | 'runs' | 'metrics' | 'outputs' | 'analyze';

/** Propriedades do componente WorkspaceTabs. */
interface WorkspaceTabsProps {
  /** ID da aba atualmente ativa. */
  activeTab: TabId;
  /** Função para alterar a aba ativa. */
  setActiveTab: (tab: TabId) => void;
  /** Lista de eventos para exibir na aba Timeline. */
  events: TimelineEvent[];
}

/**
 * Componente principal de navegação do painel central.
 * Gerencia a exibição condicional do conteúdo baseado na aba selecionada.
 */
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

# DiscoveryNotes.tsx
cat > packages/ui/src/components/discovery/DiscoveryNotes.tsx <<EOF
import React from 'react';

/**
 * Painel lateral direito que exibe as notas de descoberta coletadas pelo Agente.
 * Exibe Intenção, Requisitos, Restrições e Exemplos.
 */
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

echo "✅ Código saneado e documentado (UI/CLI)."
echo "👉 Execute ./42_pipeline_checklist.sh para garantir integridade."
