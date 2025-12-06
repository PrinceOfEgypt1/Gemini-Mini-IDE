export interface StreamEvent {
  type: 'INFO' | 'PROGRESS' | 'FILE' | 'COMPLETE' | 'ERROR';
  message: string;
  timestamp: number;
  data?: unknown;
}

export function parseStreamEvent(line: string): StreamEvent | null {
  try { return JSON.parse(line) as StreamEvent; } 
  catch { return null; }
}
