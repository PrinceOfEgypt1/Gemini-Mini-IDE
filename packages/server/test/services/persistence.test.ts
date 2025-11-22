import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
// FIX: Adicionado .js no final do import (obrigatório em ESM NodeNext)
import { PersistenceService } from '../../src/services/persistence.js';
import { AnalyzeResponse } from '@mini-ide/shared';

const TEST_DIR = path.join(__dirname, 'test-bundles');

describe('PersistenceService', () => {
  const service = new PersistenceService(TEST_DIR);

  beforeAll(async () => {
    await service.init();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it('deve salvar o arquivo JSON corretamente', async () => {
    const mockData: AnalyzeResponse = {
      summary: 'Teste',
      inputLength: 5,
      outputLength: 5,
      requestId: '123-abc',
      timestamp: new Date().toISOString(),
      budgetUsed: 0,
      budgetRemaining: 100
    };

    const savedPath = await service.saveBundle(mockData);

    const fileExists = await fs.stat(savedPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    const content = await fs.readFile(savedPath, 'utf-8');
    const json = JSON.parse(content);
    expect(json.requestId).toBe('123-abc');
  });
});
