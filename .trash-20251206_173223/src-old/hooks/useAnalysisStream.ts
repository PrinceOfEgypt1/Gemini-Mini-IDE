import { useState, useCallback } from 'react';
import { fetchStream, StreamEvent } from '../utils/stream';

export interface GeneratedFile { path: string; content: string; language?: string; }
export interface GeneratedProject { engine?: { files?: GeneratedFile[] }; summary?: string; }

export function useAnalysisStream() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partialProject, setPartialProject] = useState<GeneratedProject>({ engine: { files: [] } });

  const startAnalysis = useCallback(async (prompt: string, context?: unknown) => {
    setIsAnalyzing(true);
    setEvents([]);
    setPartialProject({ engine: { files: [] } });
    await fetchStream('/api/analyze', { text: prompt, currentContext: context }, 
      (ev) => {
        setEvents(p => [...p, ev]);
        if (ev.type === 'FILE' && ev.data) {
          const f = ev.data as GeneratedFile;
          setPartialProject(prev => ({ ...prev, engine: { files: [...(prev.engine?.files || []), { ...f, content: f.content || "// ..." }] } }));
        }
        if (ev.type === 'RESULT') {
           setPartialProject(ev.data as GeneratedProject);
           setIsAnalyzing(false);
        }
      },
      (err) => {
        setEvents(p => [...p, { type: 'ERROR', message: err, timestamp: new Date().toISOString() }]);
        setIsAnalyzing(false);
      }
    );
  }, []);
  return { startAnalysis, isAnalyzing, events, partialProject };
}
