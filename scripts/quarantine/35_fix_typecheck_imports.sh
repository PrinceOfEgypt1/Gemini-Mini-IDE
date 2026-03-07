#!/usr/bin/env bash
set -e

echo "🚑 Sprint 7.2: Corrigindo Imports ESM e Exports de Pacotes..."

# 1. Corrigir Import no Teste de Persistência (Adicionar .js)
# -----------------------------------------------------
echo "📝 Ajustando import em persistence.test.ts..."
cat > packages/server/test/services/persistence.test.ts <<EOF
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
EOF

# 2. Corrigir package.json do Agente e Shared (Exports para NodeNext)
# O TypeScript NodeNext precisa saber onde achar os tipos via "exports"
# -----------------------------------------------------
echo "⚙️ Configurando exports em @mini-ide/analysis-agent..."
tmp=$(mktemp)
jq '.exports = { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } } | .types = "./dist/index.d.ts"' packages/analysis-agent/package.json > "$tmp" && mv "$tmp" packages/analysis-agent/package.json

echo "⚙️ Configurando exports em @mini-ide/shared..."
tmp2=$(mktemp)
jq '.exports = { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } } | .types = "./dist/index.d.ts"' packages/shared/package.json > "$tmp2" && mv "$tmp2" packages/shared/package.json

# 3. Rebuild das dependências para gerar os .d.ts corretos
# -----------------------------------------------------
echo "🏗️ Recompilando dependências (Shared e Agent)..."
pnpm --filter @mini-ide/shared build
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Correções ESM aplicadas."
echo "👉 Execute ./42_pipeline_checklist.sh"
