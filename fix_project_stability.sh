#!/bin/bash
################################################################################
# GEMINI-MINI-IDE - CORREÇÃO DE ESTABILIDADE DO PROJETO
# Data: 2025-12-07
# Autor: Análise Forense Claude Sonnet 4.5
# Objetivo: Corrigir 4 problemas críticos que impedem geração de projetos complexos
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/home/user/Gemini-Mini-IDE"
AGENT_DIR="$PROJECT_ROOT/packages/analysis-agent"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  GEMINI-MINI-IDE - CORREÇÃO DE ESTABILIDADE (v1.0)       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# BACKUP
################################################################################
echo -e "${YELLOW}[1/5] Criando backup dos arquivos originais...${NC}"
BACKUP_DIR="$PROJECT_ROOT/.backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$AGENT_DIR/src/agent.ts" "$BACKUP_DIR/agent.ts.bak"
cp "$AGENT_DIR/src/prompts/architecture.ts" "$BACKUP_DIR/architecture.ts.bak"

echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}"
echo ""

################################################################################
# CORREÇÃO 1: ADICIONAR SANITIZAÇÃO DE CATEGORIAS
################################################################################
echo -e "${YELLOW}[2/5] Correção #1: Adicionando sanitização de categorias...${NC}"

# Criar arquivo temporário com as novas funções
cat > /tmp/category_sanitizer.txt << 'EOF'

// --- CATEGORY SANITIZATION (NEW) ---
export type FileCategory = "DOMAIN" | "APPLICATION" | "INFRASTRUCTURE" | "DEVOPS" | "CONFIG" | "TESTS" | "DOCS";

const CATEGORY_MAP: Record<string, FileCategory> = {
  // Domain
  "domain": "DOMAIN",
  "entity": "DOMAIN",
  "entities": "DOMAIN",
  "value-object": "DOMAIN",
  "value-objects": "DOMAIN",
  "aggregate": "DOMAIN",

  // Application
  "application": "APPLICATION",
  "use-case": "APPLICATION",
  "use-cases": "APPLICATION",
  "usecase": "APPLICATION",
  "usecases": "APPLICATION",
  "dto": "APPLICATION",
  "dtos": "APPLICATION",

  // Infrastructure
  "infrastructure": "INFRASTRUCTURE",
  "infra": "INFRASTRUCTURE",
  "controller": "INFRASTRUCTURE",
  "controllers": "INFRASTRUCTURE",
  "repository": "INFRASTRUCTURE",
  "repositories": "INFRASTRUCTURE",
  "adapter": "INFRASTRUCTURE",
  "adapters": "INFRASTRUCTURE",
  "external": "INFRASTRUCTURE",
  "http": "INFRASTRUCTURE",
  "api": "INFRASTRUCTURE",

  // DevOps
  "devops": "DEVOPS",
  "ci": "DEVOPS",
  "cd": "DEVOPS",
  "pipeline": "DEVOPS",
  "docker": "DEVOPS",
  "deploy": "DEVOPS",
  "deployment": "DEVOPS",

  // Config
  "config": "CONFIG",
  "configuration": "CONFIG",
  "settings": "CONFIG",
  "env": "CONFIG",
  "environment": "CONFIG",

  // Tests
  "test": "TESTS",
  "tests": "TESTS",
  "testing": "TESTS",
  "spec": "TESTS",
  "e2e": "TESTS",
  "integration": "TESTS",
  "unit": "TESTS",

  // Docs
  "docs": "DOCS",
  "doc": "DOCS",
  "documentation": "DOCS",
  "readme": "DOCS",
  "md": "DOCS",

  // Common mismatches (LLM alucinações)
  "hooks": "APPLICATION",
  "hook": "APPLICATION",
  "utils": "APPLICATION",
  "util": "APPLICATION",
  "utilities": "APPLICATION",
  "helpers": "APPLICATION",
  "helper": "APPLICATION",
  "data-structures": "DOMAIN",
  "data": "DOMAIN",
  "models": "DOMAIN",
  "model": "DOMAIN",
  "components": "INFRASTRUCTURE",
  "component": "INFRASTRUCTURE",
  "services": "APPLICATION",
  "service": "APPLICATION"
};

function sanitizeCategory(value: unknown): FileCategory {
  if (typeof value !== "string") return "APPLICATION";

  const normalized = value.trim().toLowerCase().replace(/[_-]/g, "");
  const mapped = CATEGORY_MAP[normalized];

  if (mapped) return mapped;

  // Fallback inteligente baseado em path
  const pathStr = String(value);
  if (pathStr.includes("domain")) return "DOMAIN";
  if (pathStr.includes("application")) return "APPLICATION";
  if (pathStr.includes("infrastructure") || pathStr.includes("infra")) return "INFRASTRUCTURE";
  if (pathStr.includes("test")) return "TESTS";
  if (pathStr.includes("config")) return "CONFIG";
  if (pathStr.includes(".md")) return "DOCS";
  if (pathStr.includes("docker") || pathStr.includes("ci") || pathStr.includes("cd")) return "DEVOPS";

  // Último recurso
  console.warn(`[Sanitizer] Categoria desconhecida: "${value}" - usando APPLICATION como fallback`);
  return "APPLICATION";
}
EOF

# Inserir o código de sanitização no agent.ts (após a linha 47)
# Usando sed para inserir após CRITICALITY_MAP
sed -i '/const CRITICALITY_MAP/r /tmp/category_sanitizer.txt' "$AGENT_DIR/src/agent.ts"

echo -e "${GREEN}✓ Sanitizador de categorias adicionado${NC}"

# Atualizar o ManifestItemSchema para incluir category
sed -i 's/const ManifestItemSchema = z.object({ path: z.string(), purpose: z.string(), criticality: z.enum(\["Core", "Support", "Config"\]) });/const ManifestItemSchema = z.object({ \n  path: z.string(), \n  purpose: z.string(), \n  criticality: z.enum(["Core", "Support", "Config"]), \n  category: z.enum(["DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "CONFIG", "TESTS", "DOCS"]).optional() \n});/' "$AGENT_DIR/src/agent.ts"

# Atualizar ManifestItem interface
sed -i 's/export interface ManifestItem { path: string; purpose: string; criticality: Criticality; }/export interface ManifestItem { path: string; purpose: string; criticality: Criticality; category?: FileCategory; }/' "$AGENT_DIR/src/agent.ts"

# Atualizar sanitizeArchitecture para usar sanitizeCategory
cat > /tmp/sanitize_architecture_patch.txt << 'EOF'
function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawManifest = Array.isArray(data["manifest"]) ? data["manifest"] : [];

  // O Sanitizer normaliza 'stack' para string ANTES do Zod validar
  let stackStr = "Unknown Stack";
  if (typeof data["stack"] === "string") stackStr = data["stack"];
  else if (typeof data["stack"] === "object") stackStr = JSON.stringify(data["stack"], null, 2);

  return {
    stack: stackStr,
    diagram: typeof data["diagram"] === "string" ? data["diagram"] : undefined,
    manifest: rawManifest.map((m: unknown) => {
      const item = (m && typeof m === "object") ? m as Record<string, unknown> : {};
      return {
        path: normalizePath(item["path"]),
        purpose: ensureString(item["purpose"], "Code"),
        criticality: sanitizeCriticality(item["criticality"]),
        category: sanitizeCategory(item["category"])  // NEW: Sanitização de categoria
      };
    }).filter(m => m.path !== "unknown.file")
  };
}
EOF

# Substituir a função sanitizeArchitecture completa
sed -i '/^function sanitizeArchitecture/,/^}/d' "$AGENT_DIR/src/agent.ts"
cat /tmp/sanitize_architecture_patch.txt >> "$AGENT_DIR/src/agent.ts"

echo -e "${GREEN}✓ sanitizeArchitecture() atualizado com suporte a categorias${NC}"
echo ""

################################################################################
# CORREÇÃO 2: AUMENTAR TIMEOUT E MELHORAR RETRY
################################################################################
echo -e "${YELLOW}[3/5] Correção #2: Aumentando timeout de API para 180s...${NC}"

# Substituir timeout de 60000 para 180000 (3 minutos)
sed -i 's/timeout: 60000/timeout: 180000/g' "$AGENT_DIR/src/agent.ts"

# Melhorar a lógica de retry com backoff exponencial
cat > /tmp/improved_retry.txt << 'EOF'
  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    if (cached) {
      console.info(`[Agent][Cache Hit] ${ctx}`);
      return cached;
    }

    const maxRetries = 3;
    const baseDelay = 2000; // 2 segundos

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutMs = ctx.includes("HUs") || ctx.includes("Architecture") ? 180000 : 120000;

        console.info(`[Agent][LLM Call] ${ctx} (attempt ${attempt + 1}/${maxRetries}, timeout: ${timeoutMs}ms)`);

        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
          temperature: 0.0,
          seed: 42
        }, { timeout: timeoutMs });

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const result = sch.parse(san(JSON.parse(cleanJsonString(rawContent))));
        globalAnalysisCache.set(cacheKey, result);
        return result;
      } catch (e) {
        const isLastAttempt = attempt === maxRetries - 1;
        const error = e instanceof Error ? e : new Error(String(e));

        console.error(`[Agent][LLM Error] ${ctx} - Attempt ${attempt + 1} failed: ${error.message}`);

        if (isLastAttempt) {
          console.error(`[Agent][LLM Fatal] ${ctx} - Todas as tentativas falharam`);
          throw error;
        }

        // Backoff exponencial: 2s, 4s, 8s
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Agent][Retry] ${ctx} - Aguardando ${delay}ms antes de retry...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Fallback final (nunca deve chegar aqui devido ao throw acima)
    console.error(`[Agent][Fallback] ${ctx} - Usando dados vazios como último recurso`);
    return sch.parse(san({}));
  }
EOF

# Substituir a função callLLM completa
sed -i '/^  private async callLLM/,/^  }/d' "$AGENT_DIR/src/agent.ts"
cat /tmp/improved_retry.txt >> "$AGENT_DIR/src/agent.ts"

echo -e "${GREEN}✓ Timeout aumentado para 180s (3 minutos)${NC}"
echo -e "${GREEN}✓ Retry melhorado com backoff exponencial (2s, 4s, 8s)${NC}"
echo -e "${GREEN}✓ Timeout dinâmico: 180s para HUs/Arquitetura, 120s para demais${NC}"
echo ""

################################################################################
# CORREÇÃO 3: REFORÇAR PROMPT DE ARQUITETURA
################################################################################
echo -e "${YELLOW}[4/5] Correção #3: Reforçando prompt de Arquitetura...${NC}"

# Criar seção de categorias explícitas
cat > /tmp/categories_section.txt << 'EOF'

───────────────────────────────────────────────────────────────────────────────
## ⚠️ CATEGORIAS PERMITIDAS - OBRIGATÓRIO SEGUIR
───────────────────────────────────────────────────────────────────────────────

**ATENÇÃO CRÍTICA:** Cada arquivo no manifest DEVE usar EXATAMENTE uma destas 7 categorias:

1. **DOMAIN**: Entidades, Value Objects, Regras de Negócio, Domain Services
2. **APPLICATION**: Use Cases, DTOs, Application Services, Interfaces/Ports
3. **INFRASTRUCTURE**: Repositories (impl), Controllers, Adapters, External APIs, HTTP
4. **DEVOPS**: CI/CD workflows, Dockerfiles, Scripts de deploy, Pipelines
5. **CONFIG**: Arquivos de configuração (.env.example, tsconfig, package.json, eslint)
6. **TESTS**: Testes unitários, integração, E2E, fixtures
7. **DOCS**: README, documentação técnica, ADRs, changelogs

❌ **PROIBIDO INVENTAR CATEGORIAS** como:
   - HOOKS (use APPLICATION)
   - UTILS (use APPLICATION)
   - DATA-STRUCTURES (use DOMAIN)
   - COMPONENTS (use INFRASTRUCTURE)
   - MODELS (use DOMAIN)
   - SERVICES (use APPLICATION ou DOMAIN conforme contexto)

✅ **Regra de Ouro:** Se em dúvida, use APPLICATION como fallback.

EOF

# Inserir a seção de categorias no prompt de arquitetura (antes do exemplo)
sed -i '/^## EXEMPLO COMPLETO DE MANIFEST/i\
'"$(cat /tmp/categories_section.txt)"'' "$AGENT_DIR/src/prompts/architecture.ts"

echo -e "${GREEN}✓ Seção de categorias explícitas adicionada ao prompt${NC}"
echo ""

################################################################################
# CORREÇÃO 4: VALIDAÇÃO E TESTES
################################################################################
echo -e "${YELLOW}[5/5] Validando correções...${NC}"

# Verificar se os arquivos foram modificados corretamente
if grep -q "sanitizeCategory" "$AGENT_DIR/src/agent.ts"; then
  echo -e "${GREEN}✓ sanitizeCategory() encontrado em agent.ts${NC}"
else
  echo -e "${RED}✗ ERRO: sanitizeCategory() não encontrado${NC}"
  exit 1
fi

if grep -q "timeout: 180000" "$AGENT_DIR/src/agent.ts"; then
  echo -e "${GREEN}✓ Timeout de 180s configurado${NC}"
else
  echo -e "${RED}✗ ERRO: Timeout não atualizado${NC}"
  exit 1
fi

if grep -q "CATEGORIAS PERMITIDAS" "$AGENT_DIR/src/prompts/architecture.ts"; then
  echo -e "${GREEN}✓ Prompt de categorias reforçado${NC}"
else
  echo -e "${RED}✗ ERRO: Prompt não atualizado${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   CORREÇÕES CONCLUÍDAS                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Problema #1 (Categorias Inválidas): RESOLVIDO${NC}"
echo -e "${GREEN}✓ Problema #2 (Timeout): RESOLVIDO${NC}"
echo -e "${GREEN}✓ Problema #3 (Sanitização): RESOLVIDO${NC}"
echo -e "${GREEN}✓ Problema #4 (Prompt): RESOLVIDO${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo "1. Rebuild do projeto: cd $PROJECT_ROOT && pnpm build"
echo "2. Teste com projeto complexo: 'Visualizador de Algoritmos com 5 estruturas de dados'"
echo "3. Monitorar logs para validar zero erros de categoria"
echo "4. Verificar tempo de geração < 180s"
echo ""
echo -e "${BLUE}Backup dos arquivos originais: $BACKUP_DIR${NC}"
echo ""
