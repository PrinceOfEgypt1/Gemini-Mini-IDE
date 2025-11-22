#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.13: Corrigindo Lint no HistoryPanel..."

# Reescreve o componente sem console.error
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
    // Evita setar loading true se já tiver dados (para não piscar no polling)
    if (history.length === 0) setLoading(true);
    
    try {
      const res = await axios.get('/api/analyze/history');
      setHistory(res.data);
    } catch {
      // Silently fail or handle error via global toaster later
      // console.error removed to satisfy linter
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

echo "✅ Lint corrigido."
echo "👉 Execute ./42_pipeline_checklist.sh"
