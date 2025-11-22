# Mini-IDE — Manual de Engenharia

> **Versão do Documento: 5.6 (Phase 10 Done)
> **Versão do Software: v0.10.0 (Project Wizard)
> **Data: 2025-11-22
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Detalhamento Técnico)

### ✅ Fase 1: Fundação e Governança
**Objetivo:** Setup do monorepo e pipeline.
* **Scripts:** `01_...sh` a `04_...sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **11.3** | HU-Gov-Docs-Minimas | `README.md`, `pnpm-workspace.yaml`, `tsconfig.base.json` |
| **5.4** | HU-Quality-Pipeline-Checklist | `42_pipeline_checklist.sh`, `vitest.config.ts` |
| **1.5** | HU-Server-Logging-JSON | Configuração inicial de logging no `package.json` |

### ✅ Fase 2: Motor de Análise (Backend Core)
**Objetivo:** Servidor HTTP e Contratos de Tipos.
* **Scripts:** `05_sprint_2_core.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **1.7** | HU-Server-Analyze-Shape-Contract | `shared/src/types/analyze-request.ts`<br>`shared/src/types/analyze-response.ts` |
| **1.4** | HU-Server-Healthz | Rota `GET /healthz` em `server/src/index.ts` |
| **1.1** | HU-Server-Analyze-200 | Rota `POST /analyze` com integração de tipos |
| **1.2** | HU-Server-Analyze-400 | Validação de input (Zod/Manual) no controller |

### ✅ Fase 3: Inteligência (O Cérebro)
**Objetivo:** Integração com LLM e Provider Pattern.
* **Scripts:** `09_sprint_3_intelligence.sh`, `10_fix_agent_deps.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **12.3** | HU-LLM-Provider-Abstraction | `analysis-agent/src/providers/llm-provider.ts` |
| **3.1** | HU-LLM-Client-DeepSeek | `analysis-agent/src/providers/deepseek-provider.ts` |
| **N/A** | Mock Provider | `analysis-agent/src/providers/mock-provider.ts` |
| **2.3** | HU-Analysis-Context | `analysis-agent/src/index.ts` (Orquestrador) |
| **3.10** | HU-LLM-Response-Schema | Lógica de parse JSON no Agente. |

### ✅ Fase 4: Interface CLI
**Objetivo:** Validação funcional via terminal.
* **Scripts:** `11_sprint_4_cli.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **7.1** | HU-CLI-Analyze | `cli/src/index.ts` (Comando analyze, spinner, axios) |
| **7.2** | HU-CLI-Config | Estrutura base de flags na CLI. |

### ✅ Fase 5: Interface Visual (UI Shell)
**Objetivo:** Estrutura React baseada no wireframe.
* **Scripts:** `12_sprint_5_ui_shell.sh`, `13_fix_scripts.sh`, `24_fix_ui_tsconfig.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **9.1** | HU-UI-Explore-Mode-001 | `ui/src/App.tsx` (Layout Grid 3 colunas) |
| **13.1** | HU-UI-Server-BaseURL-Config | `ui/vite.config.ts` (Proxy reverso) |
| **13.3** | HU-UI-Analyze-Playground | Chat no rodapé conectado ao backend |

### ✅ Fase 6: Refinamento e UX (Polimento)
**Objetivo:** Interatividade, Feedback Visual e Testes de UI.
* **Scripts:** `15_...sh` a `21_...sh`

| HU ID | Título | Artefatos Técnicos Criados/Refatorados |
| :--- | :--- | :--- |
| **9.12** | HU-UI-Explore-Interactions-012 | `ui/src/contexts/ToastContext.tsx`<br>`ui/src/components/common/Button.tsx` |
| **9.2** | HU-UI-Discovery-Notes-002 | `ui/src/components/discovery/DiscoveryNotes.tsx` |
| **9.3** | HU-UI-Timeline-003 | `ui/src/components/explore/ExploreTimeline.tsx` |
| **9.4** | HU-UI-Tabs-004 | `ui/src/components/WorkspaceTabs.tsx` |
| **9.16** | HU-UI-Explore-Error-Handling-016 | Lógica `try/catch` no App.tsx com Toasts |
| **9.17** | HU-UI-Explore-Loading-States-017 | Spinners nos botões, estados desabilitados |
| **5.1** | HU-Quality-Unit-Tests (UI) | `ui/test/**/*.test.tsx` (Ambiente JSDOM configurado) |

### ✅ Fase 7: Persistência e Histórico
**Objetivo:** Salvar dados em disco e histórico.
* **Scripts:** `33_sprint_7_persistence.sh`, `45_sprint_7_history_ui.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **6.1** | HU-Persistence-Bundles | `server/src/services/persistence.ts` (Save JSON) |
| **6.3** | HU-Persistence-Logs | Integração `pino-roll` no Server |
| **13.5** | HU-UI-Analyze-Result-History | `ui/src/components/analyze/HistoryPanel.tsx` |
| **N/A** | API de Histórico | Endpoint `GET /analyze/history` |

### ✅ Fase 8: Robustez do Backend (Hardening)
**Objetivo:** Documentação automática, controle de custos e tratamento de erros.
* **Scripts:** `52_sprint_8_hardening.sh` a `60_fix_fastify_schema.sh`

| HU ID | Título | Artefatos Técnicos Criados |
| :--- | :--- | :--- |
| **1.6** | HU-Server-OpenAPI | `server/src/index.ts` (Swagger/OpenAPI config) |
| **1.3** | HU-Server-Analyze-500 | `fastify.setErrorHandler` (Global Handler) |
| **2.1** | HU-Analysis-CompactPrompt | `analysis-agent/src/utils/prompt-optimizer.ts` |
| **2.2** | HU-Analysis-Budget-Check | `server/src/services/budget.ts` |
| **12.2** | HU-Server-Budget-Per-Context | Lógica de instância no `BudgetService` |
| **5.1** | HU-Quality-Unit-Tests (Services) | `server/test/services/budget.test.ts`<br>`analysis-agent/test/utils/prompt-optimizer.test.ts` |

---

## 2. Roadmap Futuro (Fases 9-14)

### 📅 Fase 9: Orquestração de Personas
**Objetivo:** Implementar lógica de IA complexa.
- **3.2** `HU-LLM-Persona-Analysis`
- **3.3** `HU-LLM-Persona-Product`
- **3.4** `HU-LLM-Persona-Architect`
- **3.5** `HU-LLM-Persona-Engine`
- **3.6** `HU-LLM-Persona-UX`
- **3.7** `HU-LLM-Persona-Quality`
- **3.8** `HU-LLM-Persona-Ops`
- **3.9** `HU-LLM-Persona-Fenix`

### 📅 Fase 10: Fluxo de Engenharia (Wizard)
**Objetivo:** Criação de projetos guiada.
- **9.6** `HU-UI-Project-Creation-006`
- **9.7** `HU-UI-RealTime-Preview-007`
- **10.1** `HU-MINI-IDE-Discovery-001`
- **10.2** `HU-MINI-IDE-Discovery-002`
- **10.3** `HU-MINI-IDE-Env-003`
- **10.4** `HU-MINI-IDE-Env-004`
- **10.5** `HU-MINI-IDE-Planning-005`
- **10.6** `HU-MINI-IDE-Dev-006`

### 📅 Fase 11: Consolidação e Exportação
**Objetivo:** Geração de arquivos.
- **4.1** `HU-Consolidator-Parse`
- **4.2** `HU-Consolidator-Extract-HUs`
- **4.3** `HU-Consolidator-Extract-Code`
- **4.4** `HU-Consolidator-Extract-Tests`
- **4.5** `HU-Consolidator-Extract-Docs`
- **4.6** `HU-Consolidator-Extract-Scripts`
- **9.5** `HU-UI-Export-005`

### 📅 Fase 12: CLI Avançada
**Objetivo:** Power User Features.
- **7.2** `HU-CLI-Config`
- **7.3** `HU-CLI-Workspace`
- **8.1** `HU-UI-Chat`
- **8.3** `HU-UI-Settings`

### 📅 Fase 13: Acessibilidade e Polimento
**Objetivo:** WCAG Compliance.
- **9.8** `HU-UI-Theme-System-008`
- **9.14** `HU-UI-Explore-Keyboard-Nav-014`
- **9.15** `HU-UI-Explore-Accessibility-015`
- **9.18** `HU-UI-Explore-Micro-Interactions-018`

### 📅 Fase 14: Hardening e Produção
**Objetivo:** CI/CD e Release.
- **5.1** `HU-Quality-Unit-Tests` (Enforcement)
- **5.2** `HU-Quality-Schema-Validation`
- **5.3** `HU-Quality-Smoke-Bats`
- **11.1** `HU-Gov-Release-Checklist`
- **11.2** `HU-Gov-Announcements`
- **12.1** `HU-Gov-CI-CD`
- **12.4** `HU-Quality-Coverage-Thresholds`
- **12.5** `HU-Quality-E2E-Flow`
- **12.6** `HU-Server-Metrics-Observability`

---

---

## 📋 Registro da Fase 9: Orquestração de Personas (Concluída)

**Objetivo:** Implementar lógica de IA complexa (Chain of Thought) substituindo o mock simples.

### Artefatos Técnicos Entregues
*   **Base de Personas:** `analysis-agent/src/personas/base-persona.ts` (Classe Abstrata).
*   **Personas Especializadas:** Implementadas 8 classes em `analysis-agent/src/personas/*.ts` (Analysis, Product, Architect, Engine, UX, Quality, Ops, Fenix).
*   **Orquestrador:** `AnalysisAgent` atualizado para chamar as personas sequencialmente, passando o contexto de uma para a outra.
*   **Mock Inteligente:** `MockProvider` atualizado para simular respostas específicas baseadas no prompt de cada persona, permitindo testes sem custo de API.

### Próximos Passos Imediatos (Fase 10)
*   Implementar geração de HUs sob demanda (Wizard).
*   Criar scripts de ambiente reais.

---

## 📋 Registro da Fase 10: Fluxo de Engenharia (Concluída)

**Objetivo:** Implementar o "Golden Path" de criação de projetos: Intenção -> HUs -> Scripts.

### Artefatos Técnicos Entregues
*   **Backend Services:**
    *   `analysis-agent/src/services/discovery-service.ts`: Gera HUs estruturadas via LLM.
    *   `analysis-agent/src/services/generator-service.ts`: Gera scripts Bash (`setup.sh`, `pipeline.sh`).
*   **API Endpoints:**
    *   `POST /discovery/hus`: Endpoint para gerar HUs a partir de intenção.
    *   `POST /wizard/generate`: Endpoint para gerar o pacote de scripts final.
*   **Frontend Wizard:**
    *   `ui/src/components/wizard/ProjectWizard.tsx`: Modal de 3 passos (Intenção, Revisão, Download).
    *   Integração com botão "Criar Projeto" no Header.

### Próximos Passos Imediatos (Fase 11)
*   Implementar o **Consolidator** para transformar o plano abstrato em código-fonte real (arquivos de projeto).
*   Permitir exportação do código gerado (.zip).
