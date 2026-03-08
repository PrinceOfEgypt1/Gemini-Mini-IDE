#!/usr/bin/env bash
set -e

echo "🚑 Sprint 8.3: Adicionando extensão .js no import do teste (Regra ESM)..."

# Reescreve o arquivo de teste com a importação correta (.js)
cat > packages/analysis-agent/test/utils/prompt-optimizer.test.ts <<EOF
import { describe, it, expect } from 'vitest';
// FIX: Adicionado .js ao final do import
import { PromptOptimizer } from '../../src/utils/prompt-optimizer.js';

describe('PromptOptimizer', () => {
  it('deve remover espaços extras', () => {
    const input = '  Ola    Mundo  ';
    const output = PromptOptimizer.optimize(input);
    expect(output).toBe('Ola Mundo');
  });

  it('deve truncar texto muito longo', () => {
    const input = 'A'.repeat(200);
    const output = PromptOptimizer.optimize(input, 50);
    expect(output.length).toBe(50);
  });
});
EOF

echo "✅ Import corrigido."
echo "👉 Execute ./42_pipeline_checklist.sh"
