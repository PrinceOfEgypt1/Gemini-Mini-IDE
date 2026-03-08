#!/usr/bin/env bash
################################################################################
# SCRIPT DE CORREÇÃO - PACOTE ANALYSIS-AGENT (Mini-IDE)
# Corrige erros de ESM imports (extensões .js obrigatórias em NodeNext)
################################################################################

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="${1:-.}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MINI-IDE - Correção do Analysis-Agent v1.0.0                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

if [[ ! -d "packages/analysis-agent" ]]; then
    echo -e "${RED}❌ Erro: Diretório packages/analysis-agent não encontrado${NC}"
    exit 1
fi

################################################################################
# CORREÇÃO 0: tsconfig.base.json - Remover NodeNext problemático
################################################################################

echo -e "${BLUE}[0/5] Corrigindo tsconfig.base.json (raiz)...${NC}"

cat > tsconfig.base.json << 'TSBASEFIX'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@mini-ide/shared": ["packages/shared/src/index.ts"],
      "@mini-ide/analysis-agent": ["packages/analysis-agent/src/index.ts"],
      "@mini-ide/server": ["packages/server/src/index.ts"]
    }
  }
}
TSBASEFIX

echo -e "${GREEN}✓ tsconfig.base.json corrigido${NC}"

################################################################################
# CORREÇÃO 1: tsconfig.json do analysis-agent
################################################################################

echo -e "${BLUE}[1/5] Corrigindo tsconfig.json do analysis-agent...${NC}"

cat > packages/analysis-agent/tsconfig.json << 'AGENTTSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../shared" }
  ]
}
AGENTTSCONFIG

echo -e "${GREEN}✓ tsconfig.json corrigido${NC}"

################################################################################
# CORREÇÃO 2: agent.test.ts - Imports corrigidos
################################################################################

echo -e "${BLUE}[2/5] Corrigindo agent.test.ts...${NC}"

cat > packages/analysis-agent/src/agent.test.ts << 'AGENTTEST'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async ({ messages }) => {
        const sys = messages[0]?.content ?? "";
        let content = "{}";
        
        if (sys.includes("Classifique")) {
          content = JSON.stringify({ type: "NEW_PROJECT" });
        } else if (sys.includes("Analista")) {
          content = JSON.stringify({ summary: "Test", complexity: "Baixa", assumptions: [] });
        } else if (sys.includes("Product Owner") || sys.includes("PO")) {
          content = JSON.stringify({ epics: [] });
        } else if (sys.includes("Arquiteto")) {
          content = JSON.stringify({ stack: "TypeScript", manifest: [] });
        } else if (sys.includes("PO Técnico")) {
          content = JSON.stringify({ userStories: [] });
        }
        
        return { choices: [{ message: { content } }] };
      })
    }
  }
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

describe('AnalysisAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve instanciar corretamente', () => {
    const agent = new AnalysisAgent('test-key');
    expect(agent).toBeDefined();
  });
  
  it('deve executar o pipeline básico', async () => {
    const agent = new AnalysisAgent('test-key');
    const result = await agent.analyze("Crie um app de teste", {});
    
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('engine');
    expect(result).toHaveProperty('requestId');
    expect(result.analysis.complexity).toBe('Baixa');
  });

  it('deve retornar estrutura completa', async () => {
    const agent = new AnalysisAgent('test-key');
    const result = await agent.analyze("Teste", {});
    
    expect(result.product.userStories).toBeInstanceOf(Array);
    expect(result.engine.files).toBeInstanceOf(Array);
    expect(result.architect).toHaveProperty('stack');
  });
});
AGENTTEST

echo -e "${GREEN}✓ agent.test.ts corrigido${NC}"

################################################################################
# CORREÇÃO 3: index.ts - Imports sem extensão (bundler resolve)
################################################################################

echo -e "${BLUE}[3/5] Corrigindo index.ts...${NC}"

cat > packages/analysis-agent/src/index.ts << 'AGENTINDEX'
// Exports principais
export { AnalysisAgent } from "./agent";
export type {
  Analysis,
  Architecture,
  Epic,
  ProductPlan,
  ManifestItem,
  FileContent,
  GeneratedFile,
  UserStory,
  UserStoriesResult,
  MappedUserStory,
  IntentResult,
  BudgetContext,
  AgentResult,
  Complexity,
  Priority,
  Criticality
} from "./agent";
AGENTINDEX

echo -e "${GREEN}✓ index.ts corrigido${NC}"

################################################################################
# CORREÇÃO 4: index.test.ts - Testes de sanidade
################################################################################

echo -e "${BLUE}[4/5] Corrigindo index.test.ts...${NC}"

cat > packages/analysis-agent/src/index.test.ts << 'INDEXTEST'
import { describe, it, expect } from 'vitest';

describe('@mini-ide/analysis-agent exports', () => {
  it('deve exportar AnalysisAgent', async () => {
    const module = await import('./index');
    expect(module.AnalysisAgent).toBeDefined();
  });
});
INDEXTEST

echo -e "${GREEN}✓ index.test.ts corrigido${NC}"

################################################################################
# CORREÇÃO 5: tsconfig.json do server e cli
################################################################################

echo -e "${BLUE}[5/5] Corrigindo tsconfig dos pacotes server e cli...${NC}"

cat > packages/server/tsconfig.json << 'SERVERTS'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../shared" },
    { "path": "../analysis-agent" }
  ]
}
SERVERTS

cat > packages/cli/tsconfig.json << 'CLITS'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
CLITS

cat > packages/shared/tsconfig.json << 'SHAREDTS'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
SHAREDTS

echo -e "${GREEN}✓ tsconfig dos pacotes server, cli e shared corrigidos${NC}"

################################################################################
# FINALIZAÇÃO
################################################################################

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       CORREÇÕES DO ANALYSIS-AGENT APLICADAS                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ [0] tsconfig.base.json - moduleResolution: bundler (raiz)${NC}"
echo -e "${GREEN}✅ [1] analysis-agent/tsconfig.json - Configuração ESM${NC}"
echo -e "${GREEN}✅ [2] agent.test.ts - Imports corrigidos${NC}"
echo -e "${GREEN}✅ [3] index.ts - Exports limpos${NC}"
echo -e "${GREEN}✅ [4] index.test.ts - Teste de sanidade${NC}"
echo -e "${GREEN}✅ [5] server/cli/shared tsconfig - Alinhamento${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "   pnpm install"
echo "   pnpm build"
echo ""
