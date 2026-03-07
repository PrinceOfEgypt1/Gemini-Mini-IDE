#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 10_restore_architecture.sh
# DESCRIÇÃO: 
#   1. Restaura a inteligência do Arquiteto para agir como Tech Lead Completo.
#   2. Garante inclusão de arquivos de config (json), CI/CD e infra.
#   3. Corrige o bug de "0 arquivos" forçando o preenchimento do manifesto.
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Restauração da Arquitetura (Tech Lead Persona)..."

# ------------------------------------------------------------------------------
# 1. Ajuste Fino nos Prompts (Ajuste para garantir arquivos)
# ------------------------------------------------------------------------------
echo ">>> Atualizando packages/analysis-agent/src/prompts/index.ts..."
cat > packages/analysis-agent/src/prompts/index.ts << 'EOF'
export const SYSTEM_PROMPTS = {
  DETECT_INTENT: `
Você é um Classificador de Intenção.
Classifique a entrada.
Retorne JSON estrito: { "type": "NEW_PROJECT" | "QUESTION" | "REFINEMENT", "reasoning": "..." }
`.trim(),

  ANALYSIS: `
Você é um Engenheiro de Requisitos Principal.
Analise o pedido do usuário.
Ignore formatação quebrada ou lixo de PDF.
Foque no objetivo de negócio e requisitos funcionais.

Retorne JSON estrito PT-BR:
{
  "summary": "Resumo técnico profissional",
  "complexity": "Alta",
  "assumptions": ["Premissa 1", "Premissa 2"]
}
`.trim(),

  PRODUCT: `
Você é um Product Owner (PO) Sênior em um time Ágil.
Sua missão é cobrir TODO o escopo funcional identificado.

Diretrizes:
1. Não economize nos Épicos. Se o sistema é complexo, crie quantos épicos forem necessários.
2. Inclua épicos técnicos (DevOps, Setup) e funcionais.

Retorne JSON estrito PT-BR:
{
  "epics": [
    {
      "title": "Nome do Épico",
      "context": "Valor de negócio",
      "requirements": ["Req 1", "Req 2"]
    }
  ]
}
`.trim(),

  ARCHITECTURE: `
Você é um Tech Lead e Arquiteto de Software Sênior.
Sua tarefa é definir a estrutura de arquivos completa para um projeto profissional.

REGRAS DE OURO (MANDATÓRIO):
1. **Infraestrutura Completa**: Você DEVE incluir arquivos de configuração na raiz.
   - package.json, tsconfig.json, .gitignore, .eslintrc.json, README.md
   - docker-compose.yml (se houver banco de dados)
   - .github/workflows/ci.yml (CI/CD básico)
   
2. **Estrutura de Código**: Separe responsabilidades (Clean Architecture ou MVC).
   - src/server.ts (ou main.tsx no front)
   - src/controllers/, src/services/, src/routes/, src/models/
   - src/utils/, src/config/

3. **Quantidade**: NÃO gere 0 arquivos. Para um sistema completo, espera-se entre 15 a 40 arquivos iniciais.
4. **Stack**: React + Vite (Frontend) e Node.js + Fastify (Backend) com TypeScript.

Retorne JSON estrito com a lista COMPLETA de arquivos:
{
  "stack": "React + Vite + Fastify + PostgreSQL",
  "diagram": "Texto explicativo da arquitetura",
  "manifest": [
    { "path": "README.md", "purpose": "Documentação Geral", "criticality": "Config" },
    { "path": "package.json", "purpose": "Dependências", "criticality": "Config" },
    { "path": "tsconfig.json", "purpose": "Config TypeScript", "criticality": "Config" },
    { "path": "src/server.ts", "purpose": "Backend Entrypoint", "criticality": "Core" },
    ... (continue listando TODOS os arquivos necessários)
  ]
}
`.trim(),

  CODE_GEN: `
Você é um Desenvolvedor Sênior Full-Stack.
Implemente o arquivo solicitado.

Regras:
1. Código Real e Completo (Sem "To be implemented").
2. Se for JSON (package.json, tsconfig), use configurações válidas e modernas.
3. Se for CI/CD (yml), use sintaxe válida do GitHub Actions.
4. Se for código (TS), use tipagem forte e tratamento de erros.

Retorne JSON estrito:
{
  "path": "caminho/do/arquivo",
  "code": "Conteúdo do arquivo (escaped)",
  "explanation": "Breve descrição"
}
`.trim(),

  USER_STORIES: `
Você é um PO Técnico.
Gere as Histórias de Usuário (HUs) para o time de desenvolvimento.
Seja detalhado nos critérios de aceite.

Retorne JSON estrito PT-BR:
{
  "userStories": [
    {
      "id": "HU-001",
      "title": "Título",
      "priority": "P0",
      "role": "Ator",
      "action": "Ação",
      "benefit": "Valor",
      "acceptanceCriteria": ["AC1", "AC2"],
      "functionalRequirements": [],
      "securityRequirements": [],
      "businessContext": "Contexto"
    }
  ]
}
`.trim()
};
EOF

# ------------------------------------------------------------------------------
# 2. Limpeza de Cache (Para garantir nova geração fresca)
# ------------------------------------------------------------------------------
echo ">>> Limpando cache antigo para forçar nova arquitetura..."
rm -f .mini-ide-cache.json

# ------------------------------------------------------------------------------
# 3. Validação
# ------------------------------------------------------------------------------
echo ">>> Validando integridade..."
pnpm --filter @mini-ide/analysis-agent lint --max-warnings 0
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Restauração Concluída."
echo "O sistema agora atuará como um Tech Lead completo."
echo "IMPORTANTE: Reinicie o servidor antes de testar!"
EOF
