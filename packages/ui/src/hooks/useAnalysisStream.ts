import { useState } from 'react';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface StreamEvent {
  type: string;
  message: string;
  timestamp: number;
}

export function useAnalysisStream() {
  const [isAnalyzing] = useState(false);
  const [events] = useState<StreamEvent[]>([]);
  const [partialProject] = useState<{ engine?: { files?: GeneratedFile[] } } | null>(null);

  const startAnalysis = async (_prompt: string) => {
    // Stub - v0.17.1 usa api.analyze() diretamente
  };

  return { startAnalysis, isAnalyzing, events, partialProject };
}
