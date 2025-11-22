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
