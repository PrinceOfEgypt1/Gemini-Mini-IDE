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

  generateKey(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    temperature: number,
    retryAttempt: number = 0
  ): string {
    // Incrementar CACHE_VERSION sempre que a lógica do agent mudar
    // para invalidar caches antigos e evitar retornar resultados desatualizados
    const CACHE_VERSION = "v18.0"; // Bumped: Fixed categories, method listing, file thresholds, cache invalidation
    const content = `${CACHE_VERSION}:${model}:${temperature}:${retryAttempt}:${systemPrompt}:${userPrompt}`;
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

  invalidate(key: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.saveToDisk();
    }
  }

  stats(): { size: number; ttlMinutes: number } {
    return { size: this.cache.size, ttlMinutes: this.ttlMs / 60000 };
  }
}

// ─── Lazy Singleton ───────────────────────────────────────────────────────────

let _globalAnalysisCache: CacheService | null = null;

/**
 * Returns the global CacheService instance, creating it lazily on first access.
 *
 * BG-05: Converted from import-time instantiation to lazy init.
 * Disk read (.mini-ide-cache.json) now deferred until first actual use.
 */
export function getGlobalAnalysisCache(): CacheService {
  if (!_globalAnalysisCache) {
    _globalAnalysisCache = new CacheService();
  }
  return _globalAnalysisCache;
}

/**
 * Resets the global CacheService (nullify reference).
 * Next call to getGlobalAnalysisCache() creates a fresh instance.
 * Primarily for testing.
 *
 * BG-05: Explicit lifecycle reset.
 */
export function resetGlobalAnalysisCache(): void {
  _globalAnalysisCache = null;
}
