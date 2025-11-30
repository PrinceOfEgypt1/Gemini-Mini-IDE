import fs from 'fs/promises';
import path from 'path';
import { AnalyzeResponse } from '@mini-ide/shared';

/** Interface para itens listados no histórico. */
export interface HistoryItem {
  filename: string;
  timestamp: string;
  requestId: string;
  summary: string;
}

/**
 * Serviço responsável por salvar artefatos e metadados em disco.
 */
export class PersistenceService {
  private baseDir: string;

  constructor(baseDir: string = 'bundles') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  /** Cria o diretório base se não existir. */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // Ignora erro se já existir ou falhar (logging seria ideal em prod)
    }
  }

  /** Salva o resultado da análise em arquivo JSON. */
  async saveBundle(data: AnalyzeResponse): Promise<string> {
    const dateFolder = new Date().toISOString().split('T')[0];
    const targetDir = path.join(this.baseDir, dateFolder);
    await fs.mkdir(targetDir, { recursive: true });
    const filename = `${data.timestamp.replace(/:/g, '-')}-${data.requestId}.json`;
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return filePath;
  }

  /** Lista o histórico de análises ordenado por data. */
  async listHistory(): Promise<HistoryItem[]> {
    const items: HistoryItem[] = [];
    try {
      const days = await fs.readdir(this.baseDir);
      for (const day of days) {
        const dayPath = path.join(this.baseDir, day);
        const stat = await fs.stat(dayPath);
        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(dayPath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const content = await fs.readFile(path.join(dayPath, file), 'utf-8');
          try {
            const json = JSON.parse(content) as AnalyzeResponse;
            items.push({
              filename: file,
              timestamp: json.timestamp,
              requestId: json.requestId,
              summary: json.summary
            });
          } catch { /* Ignora corrompidos */ }
        }
      }
      return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  }
}
