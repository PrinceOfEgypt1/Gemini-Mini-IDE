#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 07_fix_syntax_quality.sh
# DESCRIÇÃO: 
#   1. Reescreve cache.service.ts com tratamento de ESLint.
#   2. Executa validação com sintaxe correta do pnpm (--filter antes do comando).
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Polimento de Qualidade (Tentativa 2 - Syntax Fix)..."

# ------------------------------------------------------------------------------
# 1. Corrigindo packages/analysis-agent/src/services/cache.service.ts
# ------------------------------------------------------------------------------
echo ">>> Garantindo arquivo packages/analysis-agent/src/services/cache.service.ts..."
cat > packages/analysis-agent/src/services/cache.service.ts << 'EOF'
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly filePath: string;

  constructor(ttlMinutes = 60 * 24) { // 24 horas de cache por padrão
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.filePath = path.resolve(process.cwd(), ".mini-ide-cache.json");
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const json = JSON.parse(raw);
        // Reconstrui o Map a partir do JSON
        for (const [key, val] of Object.entries(json)) {
            this.cache.set(key, val as CacheEntry<unknown>);
        }
        // Log operacional permitido via disable-line
        // eslint-disable-next-line no-console
        console.log(`[Cache] Carregado do disco: ${this.cache.size} entradas.`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[Cache] Falha ao carregar do disco, iniciando vazio.", e);
    }
  }

  private saveToDisk() {
    try {
      // Converte Map para Objeto para salvar em JSON
      const obj = Object.fromEntries(this.cache);
      fs.writeFileSync(this.filePath, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Cache] Falha ao salvar no disco:", e);
    }
  }

  generateKey(systemPrompt: string, userPrompt: string, model: string, temperature: number): string {
    const content = `${model}:${temperature}:${systemPrompt}:${userPrompt}`;
    return createHash("sha256").update(content).digest("hex");
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    // Eviction simples se ficar gigante (> 5000 itens)
    if (this.cache.size >= 5000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { timestamp: Date.now(), data });
    this.saveToDisk(); // Persiste a cada escrita
  }

  stats(): { size: number; ttlMinutes: number } {
    return { size: this.cache.size, ttlMinutes: this.ttlMs / 60000 };
  }
}

// Singleton Exportado
export const globalAnalysisCache = new CacheService();
EOF

# ------------------------------------------------------------------------------
# 2. Verificação Rigorosa (Zero Warnings) - Sintaxe Correta
# ------------------------------------------------------------------------------
echo ">>> Executando validação rigorosa..."

# Correção: --filter vem ANTES do comando lint
echo ">>> [Check] ESLint (Max Warnings: 0)..."
pnpm --filter @mini-ide/analysis-agent lint --max-warnings 0 || { echo "❌ Lint falhou com warnings"; exit 1; }

echo ">>> [Check] Typecheck..."
pnpm --filter @mini-ide/analysis-agent typecheck || { echo "❌ Typecheck falhou"; exit 1; }

echo ">>> [Check] Build..."
pnpm --filter @mini-ide/analysis-agent build || { echo "❌ Build falhou"; exit 1; }

echo "✅ Polimento concluído: Código Limpo, Sem Warnings e Persistente."
EOF
