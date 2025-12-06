export type StreamEventType = 'LOG' | 'PHASE' | 'FILE' | 'WARN' | 'ERROR' | 'RESULT';

export interface StreamEvent {
  type: StreamEventType;
  message?: string;
  data?: unknown;
  timestamp: string;
}

export type OnEventCallback = (event: StreamEvent) => void;
export type OnErrorCallback = (error: string) => void;

export async function fetchStream(
  url: string,
  body: unknown,
  onEvent: OnEventCallback,
  onError: OnErrorCallback
) {
  try {
    const token = "test-token"; 

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          if (jsonStr === '[DONE]') continue;
          const event: StreamEvent = JSON.parse(jsonStr);
          onEvent(event);
        } catch {
          // ignore json parse errors
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onError(msg);
  }
}
