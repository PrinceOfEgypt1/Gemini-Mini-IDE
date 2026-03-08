#!/usr/bin/env bash
set -e

echo "📚 Atualizando documentação oficial (Governança)..."

# 1. Atualizar README.md (Guia de Uso Geral)
# -----------------------------------------------------
cat > README.md <<EOF
# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.5.0 (Alpha) - UI Shell + Backend Core + CLI
> **Pipeline:** 🟢 Passing

## 🚀 Como Rodar

Este é um monorepo. Você precisará de terminais separados para rodar o sistema completo.

### 1. Iniciar o Cérebro (Backend)
O servidor expõe a API e orquestra o agente de IA.
\`\`\`bash
# Terminal 1
# Roda na porta 3200
export DEEPSEEK_API_KEY="sua-chave" # Opcional (sem chave usa Mock)
pnpm --filter @mini-ide/server start
\`\`\`

### 2. Iniciar a Interface (Frontend)
A UI visual para exploração e chat.
\`\`\`bash
# Terminal 2
# Roda na porta 5173 (abre no navegador)
pnpm --filter @mini-ide/ui dev
\`\`\`

### 3. Usar via Linha de Comando (CLI)
Ferramenta para uso rápido via terminal.
\`\`\`bash
# Terminal 3
node packages/cli/dist/index.js analyze "Quero criar um sistema de login"
\`\`\`

## 🏗 Estrutura do Monorepo

- **@mini-ide/server**: Servidor Fastify + Integração com Agente.
- **@mini-ide/ui**: Interface React + Vite (Explore Workspace).
- **@mini-ide/analysis-agent**: Lógica de IA, Personas e Providers (Mock/DeepSeek).
- **@mini-ide/shared**: Contratos de API e Tipos TypeScript (Fonte da Verdade).
- **@mini-ide/cli**: Ferramenta de terminal.

## 🛡️ Qualidade e CI
Antes de commitar, execute o guardião:
\`\`\`bash
./42_pipeline_checklist.sh
\`\`\`
EOF

# 2. Atualizar DEVELOPMENT.md (Status Técnico e HUs)
# -----------------------------------------------------
cat > DEVELOPMENT.md <<EOF
# Mini-IDE — DEVELOPMENT.md

> **Versão Lógica:** v0.5.0 (Fase 5 Concluída)
> **Data:** $(date +%Y-%m-%d)
> **Estado:** Backend conectado à UI e CLI. Pipeline Verde.

---

## 1. Status das Fases de Desenvolvimento

| Fase | Descrição | Status | Entregáveis |
|---|---|---|---|
| **1** | **Fundação e Governança** | ✅ Concluído | Monorepo, ESLint v9, Vitest, Pipeline Script. |
| **2** | **Motor de Análise (Backend)** | ✅ Concluído | Servidor Fastify, Tipos em \`shared\`, Logs JSON. |
| **3** | **Conectando o Cérebro (IA)** | ✅ Concluído | Agente, Provider Pattern, Mock Provider, DeepSeek Client. |
| **4** | **Primeira Interface (CLI)** | ✅ Concluído | Comando \`analyze\`, integração HTTP com Server. |
| **5** | **Interface Visual (UI)** | ✅ Concluído | React + Vite, Proxy, Layout 3 Colunas, Chat Integrado. |
| **6** | **Refinamento e UX** | ⏳ Pendente | Feedback visual rico, tratamento de erros, persistência local. |

---

## 2. Histórias de Usuário (HUs) Entregues

### Fase 1: Fundação
- **HU-Gov-Docs-Minimas (11.3):** README e DEVELOPMENT iniciais criados.
- **HU-Quality-Pipeline-Checklist (5.4):** Script \`42_pipeline_checklist.sh\` implementado e bloqueante.

### Fase 2: Backend Core
- **HU-Server-Analyze-200 (1.1):** Endpoint \`/analyze\` funcional.
- **HU-Server-Healthz (1.4):** Endpoint \`/healthz\` funcional.
- **HU-Server-Logging-JSON (1.5):** Logs estruturados implementados no Fastify.
- **HU-Server-Analyze-Shape-Contract (1.7):** Tipos \`AnalyzeRequest\` e \`AnalyzeResponse\` definidos em \`@mini-ide/shared\`.

### Fase 3: Inteligência
- **HU-LLM-Client-DeepSeek (3.1):** Provider DeepSeek implementado (com fallback para Mock).
- **HU-Analysis-Context (2.3):** Estrutura básica de prompt implementada no Agente.

### Fase 4: CLI
- **HU-CLI-Analyze (7.1):** Comando \`analyze\` implementado lendo arquivos/texto.

### Fase 5: UI Shell
- **HU-UI-Explore-Mode-001 (9.1):** Layout "Explore Workspace" (3 colunas) implementado.
- **HU-UI-Server-BaseURL-Config (13.1):** Proxy do Vite configurado para \`http://localhost:3200\`.
- **HU-UI-Analyze-Playground (13.3):** Chat funcional conectado ao endpoint \`/analyze\`.

---

## 3. Arquitetura Atual

\`\`\`mermaid
graph LR
    User -->|Browser| UI[@mini-ide/ui]
    User -->|Terminal| CLI[@mini-ide/cli]
    
    UI -->|HTTP /analyze| Server[@mini-ide/server]
    CLI -->|HTTP /analyze| Server
    
    Server -->|Function Call| Agent[@mini-ide/analysis-agent]
    
    Agent -->|Dependência| Shared[@mini-ide/shared]
    Server -->|Dependência| Shared
    UI -->|Dependência (Tipos)| Shared
    
    subgraph "Analysis Agent"
        Provider[LLM Provider]
        Mock[Mock Provider]
        DeepSeek[DeepSeek Provider]
    end
    
    Agent --> Provider
\`\`\`

## 4. Próximos Passos (Fase 6)

1.  **Polimento de UX:** Adicionar *spinners* reais nos botões enquanto aguarda o backend.
2.  **Discovery Notes Dinâmicas:** Fazer o painel lateral reagir ao JSON retornado pelo agente.
3.  **Tratamento de Erros:** Toasts para falhas de conexão.
EOF

echo "✅ Documentação atualizada com sucesso!"
echo "📄 Verifique README.md e DEVELOPMENT.md."
