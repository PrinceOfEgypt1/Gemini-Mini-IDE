#!/usr/bin/env bash
set -e

echo "📚 Gerando DEVELOPMENT.md detalhado (Engenharia & Rastreabilidade)..."

cat > DEVELOPMENT.md <<EOF
# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.0 (Detailed Audit)
> **Versão do Software:** v0.6.0 (Alpha Estável - UI/UX Refined)
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

## 1. Visão Geral e Arquitetura

O **Mini-IDE** é um monorepo TypeScript focado em desenvolvimento assistido por IA.
A arquitetura segue o padrão **Clean Monorepo** com **Strict Type Boundaries**.

### Mapa de Pacotes
| Pacote | Responsabilidade | Stack Principal |
| :--- | :--- | :--- |
| \`@mini-ide/server\` | API Gateway, Orquestração, Persistência | Fastify, Node.js |
| \`@mini-ide/ui\` | Interface do Usuário (Explore Workspace) | React, Vite, CSS Modules |
| \`@mini-ide/analysis-agent\` | Lógica de IA, Prompt Engineering | Axios, Provider Pattern |
| \`@mini-ide/shared\` | **Fonte da Verdade** (Tipos, Contratos) | TypeScript Interfaces |
| \`@mini-ide/cli\` | Acesso via terminal | Commander, Chalk |

---

## 2. Workflow de Desenvolvimento

### Pré-requisitos
- Node.js v20+
- PNPM v9+

### Pipeline de Qualidade (The Guardian)
Nenhum código entra na \`main\` sem passar pelo guardião.
\`\`\`bash
./42_pipeline_checklist.sh
\`\`\`
1. **Lint:** ESLint v9 (Flat Config)
2. **Typecheck:** TSC (Strict Mode)
3. **Tests:** Vitest (Unit + Integration)
4. **Build:** TSC + Vite Build
5. **Smoke Tests:** Verificação de runtime do servidor e contrato de API.

---

## 3. Rastreabilidade de Entrega (Fases 1 a 6)

### ✅ Fase 1: Fundação e Governança
**Objetivo:** Setup do monorepo e pipeline.
* **Scripts Executados:** \`01_sprint_fundacao.sh\` a \`04_fix_tests_and_server.sh\`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **11.3** | HU-Gov-Docs-Minimas | \`README.md\`, \`pnpm-workspace.yaml\`, \`tsconfig.base.json\` |
| **5.4** | HU-Quality-Pipeline-Checklist | \`42_pipeline_checklist.sh\`, \`vitest.config.ts\` |
| **1.5** | HU-Server-Logging-JSON | Configuração inicial de logging no \`package.json\` |

### ✅ Fase 2: Motor de Análise (Backend Core)
**Objetivo:** Servidor HTTP e Contratos de Tipos.
* **Scripts Executados:** \`05_sprint_2_core.sh\`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **1.7** | HU-Server-Analyze-Shape-Contract | \`shared/src/types/analyze-request.ts\`<br>\`shared/src/types/analyze-response.ts\` |
| **1.4** | HU-Server-Healthz | Rota \`GET /healthz\` em \`server/src/index.ts\` |
| **1.1** | HU-Server-Analyze-200 | Rota \`POST /analyze\` com integração de tipos |
| **1.2** | HU-Server-Analyze-400 | Validação de input (Zod/Manual) no controller |

### ✅ Fase 3: Inteligência (O Cérebro)
**Objetivo:** Integração com LLM e Provider Pattern.
* **Scripts Executados:** \`09_sprint_3_intelligence.sh\`, \`10_fix_agent_deps.sh\`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **12.3** | HU-LLM-Provider-Abstraction | \`analysis-agent/src/providers/llm-provider.ts\` |
| **3.1** | HU-LLM-Client-DeepSeek | \`analysis-agent/src/providers/deepseek-provider.ts\` |
| **N/A** | Mock Provider | \`analysis-agent/src/providers/mock-provider.ts\` |
| **2.3** | HU-Analysis-Context | \`analysis-agent/src/index.ts\` (Orquestrador) |

### ✅ Fase 4: Interface CLI
**Objetivo:** Validação funcional via terminal.
* **Scripts Executados:** \`11_sprint_4_cli.sh\`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **7.1** | HU-CLI-Analyze | \`cli/src/index.ts\` (Comando analyze, spinner, axios) |

### ✅ Fase 5: Interface Visual (UI Shell)
**Objetivo:** Estrutura React baseada no wireframe.
* **Scripts Executados:** \`12_sprint_5_ui_shell.sh\`, \`13_fix_scripts.sh\`, \`24_fix_ui_tsconfig.sh\`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **9.1** | HU-UI-Explore-Mode-001 | \`ui/src/App.tsx\` (Layout Grid 3 colunas) |
| **13.1** | HU-UI-Server-BaseURL-Config | \`ui/vite.config.ts\` (Proxy reverso) |
| **13.3** | HU-UI-Analyze-Playground | Chat no rodapé conectado ao backend |

### ✅ Fase 6: Refinamento e UX (Polimento)
**Objetivo:** Interatividade, Feedback Visual e Testes de UI.
* **Scripts Executados:** \`15_...sh\` a \`21_...sh\` (Refatoração, Lint Fixes, Test Sync)

| HU ID | Título | Artefatos Técnicos Criados/Refatorados |
| :--- | :--- | :--- |
| **9.12** | HU-UI-Explore-Interactions-012 | \`ui/src/contexts/ToastContext.tsx\`<br>\`ui/src/components/common/Button.tsx\` |
| **9.2** | HU-UI-Discovery-Notes-002 | \`ui/src/components/discovery/DiscoveryNotes.tsx\` |
| **9.3** | HU-UI-Timeline-003 | \`ui/src/components/explore/ExploreTimeline.tsx\` |
| **9.4** | HU-UI-Tabs-004 | \`ui/src/components/WorkspaceTabs.tsx\` |
| **9.16** | HU-UI-Explore-Error-Handling-016 | Lógica \`try/catch\` no App.tsx com Toasts |
| **9.17** | HU-UI-Explore-Loading-States-017 | Spinners nos botões, estados desabilitados |
| **5.1** | HU-Quality-Unit-Tests (UI) | \`ui/test/**/*.test.tsx\` (Ambiente JSDOM configurado) |

---

## 4. Roadmap Futuro (Backlog Detalhado)

### 📅 Fase 7: Persistência e Histórico
**Objetivo:** Backend stateful.
- **6.1** \`HU-Persistence-Bundles\`
- **6.2** \`HU-Persistence-Metadata\`
- **6.3** \`HU-Persistence-Logs\`
- **13.5** \`HU-UI-Analyze-Result-History\`
- **8.2** \`HU-UI-Results\`

### 📅 Fase 8: Robustez do Backend
**Objetivo:** Hardening para produção.
- **1.3** \`HU-Server-Analyze-500\`
- **1.6** \`HU-Server-OpenAPI\`
- **2.1** \`HU-Analysis-CompactPrompt\`
- **2.2** \`HU-Analysis-Budget-Check\`
- **2.4** \`HU-Analysis-RunId\`
- **12.2** \`HU-Server-Budget-Per-Context\`

### 📅 Fase 9: Orquestração de Personas
**Objetivo:** Implementar lógica de IA complexa.
- **3.2** \`HU-LLM-Persona-Analysis\`
- **3.3** \`HU-LLM-Persona-Product\`
- **3.4** \`HU-LLM-Persona-Architect\`
- **3.5** \`HU-LLM-Persona-Engine\`
- **3.6** \`HU-LLM-Persona-UX\`
- **3.7** \`HU-LLM-Persona-Quality\`
- **3.8** \`HU-LLM-Persona-Ops\`
- **3.9** \`HU-LLM-Persona-Fenix\`

### 📅 Fase 10: Fluxo de Engenharia (Wizard)
**Objetivo:** Criação de projetos guiada.
- **9.6** \`HU-UI-Project-Creation-006\`
- **9.7** \`HU-UI-RealTime-Preview-007\`
- **10.1** \`HU-MINI-IDE-Discovery-001\`
- **10.2** \`HU-MINI-IDE-Discovery-002\`
- **10.3** \`HU-MINI-IDE-Env-003\`
- **10.4** \`HU-MINI-IDE-Env-004\`
- **10.5** \`HU-MINI-IDE-Planning-005\`
- **10.6** \`HU-MINI-IDE-Dev-006\`

### 📅 Fase 11: Consolidação e Exportação
**Objetivo:** Geração de arquivos.
- **4.1** \`HU-Consolidator-Parse\`
- **4.2** \`HU-Consolidator-Extract-HUs\`
- **4.3** \`HU-Consolidator-Extract-Code\`
- **4.4** \`HU-Consolidator-Extract-Tests\`
- **4.5** \`HU-Consolidator-Extract-Docs\`
- **4.6** \`HU-Consolidator-Extract-Scripts\`
- **9.5** \`HU-UI-Export-005\`

### 📅 Fase 12: CLI Avançada
**Objetivo:** Power User Features.
- **7.2** \`HU-CLI-Config\`
- **7.3** \`HU-CLI-Workspace\`
- **8.1** \`HU-UI-Chat\`
- **8.3** \`HU-UI-Settings\`

### 📅 Fase 13: Acessibilidade e Polimento
**Objetivo:** WCAG Compliance.
- **9.8** \`HU-UI-Theme-System-008\`
- **9.14** \`HU-UI-Explore-Keyboard-Nav-014\`
- **9.15** \`HU-UI-Explore-Accessibility-015\`
- **9.18** \`HU-UI-Explore-Micro-Interactions-018\`

### 📅 Fase 14: Hardening e Produção
**Objetivo:** CI/CD e Release.
- **5.1** \`HU-Quality-Unit-Tests\` (Enforcement)
- **5.2** \`HU-Quality-Schema-Validation\`
- **5.3** \`HU-Quality-Smoke-Bats\`
- **11.1** \`HU-Gov-Release-Checklist\`
- **11.2** \`HU-Gov-Announcements\`
- **12.1** \`HU-Gov-CI-CD\`
- **12.4** \`HU-Quality-Coverage-Thresholds\`
- **12.5** \`HU-Quality-E2E-Flow\`
- **12.6** \`HU-Server-Metrics-Observability\`

---
EOF

echo "✅ Documentação Detalhada v5.0 gerada com sucesso."
