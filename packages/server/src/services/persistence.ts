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
    const filename = `${data.timestamp.replace(/:/g, '-')}-${data.requestId}.json`;
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
