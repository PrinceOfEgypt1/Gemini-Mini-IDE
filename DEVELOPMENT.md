# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 8.0 (Phase 12 Cleaned)
> **Versão do Software:** v0.15.0 (AI Powered)
> **Data:** 2025-11-24
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico)

### ✅ Fase 1: Fundação e Governança
**Objetivo:** Setup do monorepo e pipeline.
- **Artefatos:** `pnpm-workspace.yaml`, `tsconfig.base.json`, `42_pipeline_checklist.sh`.
- **HUs:** 11.3, 5.4.

### ✅ Fase 2: Motor de Análise (Backend Core)
**Objetivo:** Servidor HTTP e Contratos de Tipos.
- **Artefatos:** `server/src/index.ts`, `shared/src/types/*.ts`.
- **HUs:** 1.1, 1.2, 1.4, 1.5, 1.7.

### ✅ Fase 3: Inteligência Artificial
**Objetivo:** Integração com LLM e Provider Pattern.
- **Artefatos:** `analysis-agent/src/providers/*`, `analysis-agent/src/index.ts`.
- **HUs:** 2.3, 3.1, 3.10, 12.3.

### ✅ Fase 4: Interface CLI
**Objetivo:** Validação funcional via terminal.
- **Artefatos:** `cli/src/index.ts`.
- **HUs:** 7.1, 7.2.

### ✅ Fase 5: Interface Visual (UI Shell)
**Objetivo:** Estrutura React baseada no wireframe.
- **Artefatos:** `ui/src/App.tsx`, `ui/vite.config.ts`.
- **HUs:** 9.1, 9.4, 13.1, 13.2, 13.3.

### ✅ Fase 6: Refinamento e UX
**Objetivo:** Interatividade, Feedback Visual e Testes de UI.
- **Artefatos:** `ToastContext.tsx`, `Button.tsx`, `ExploreTimeline.tsx`, `DiscoveryNotes.tsx`.
- **HUs:** 9.2, 9.3, 9.9, 9.10, 9.11, 9.12, 9.13, 9.16, 9.17, 13.4.

### ✅ Fase 7: Persistência e Histórico
**Objetivo:** Salvar dados em disco e histórico.
- **Artefatos:** `server/src/services/persistence.ts`, `ui/src/components/analyze/HistoryPanel.tsx`.
- **HUs:** 6.1, 6.2, 6.3, 13.5.

### ✅ Fase 8: Robustez do Backend (Hardening)
**Objetivo:** Documentação automática, controle de custos e tratamento de erros.
- **Artefatos:** `server/src/schemas.ts`, `analysis-agent/src/utils/prompt-optimizer.ts`, Swagger.
- **HUs:** 1.3, 1.6, 2.1, 2.2, 2.4, 12.2.

### ✅ Fase 9: Orquestração de Personas (O Cérebro)
**Objetivo:** Implementar lógica de IA complexa (Chain of Thought).
- **Artefatos:**
    - `analysis-agent/src/personas/*.ts` (8 classes especializadas).
- **HUs:** 3.2 a 3.9.

### ✅ Fase 10: Fluxo de Engenharia (Wizard)
**Objetivo:** Implementar o "Golden Path" de criação de projetos.
- **Artefatos:**
    - `analysis-agent/src/services/discovery-service.ts`.
    - `ui/src/components/wizard/ProjectWizard.tsx`.
- **HUs:** 9.6, 10.1 a 10.4, 10.7.

### ✅ Fase 11: Consolidação e Exportação (A Fábrica)
**Objetivo:** Materializar o projeto em arquivos reais e permitir download.
- **Artefatos:**
    - `analysis-agent/src/services/consolidator-service.ts` (Motor de geração).
    - `server/src/controllers/export.controller.ts` (Endpoint ZIP).
    - `ui/src/components/settings/SettingsModal.tsx` (Configuração).
    - `scripts/127_fix_cors_brute_force.sh` (Hardening de ambiente dev).
- **HUs Entregues:** 4.1, 4.2, 4.3, 4.6, 8.3, 9.5.

### ✅ Fase 12: Experiência do Usuário & Segurança (Produto)

### ✅ Fase 13 & 14: Polimento Visual e Inteligência Real
**Objetivo:** Temas, Segurança de API Key e Conexão com GPT-4.
- **Artefatos:**
    - `ui/.../contexts/ThemeContext.tsx` (Dark/Light Mode).
    - `analysis-agent/src/agent.ts` (Integração OpenAI/DeepSeek).
    - `server/src/index.ts` (Servidor Fastify Seguro).
- **Status:** O sistema gera código real, exporta ZIP e passa em todos os testes.
 
**Objetivo:** Transformar a ferramenta técnica em um produto amigável e seguro.
- **Artefatos:**
    - `ui/.../services/tour.ts` (Driver.js integration).
    - `ui/.../help/HelpModal.tsx` (Manual Markdown).
    - `ui/.../wizard/QuickStartGallery.tsx` (Templates).
    - `ui/.../utils/discoveryParser.ts` (Lógica Regex Local).
    - `scripts/140_implement_secure_apikey_flow.sh` (Security Middleware).
- **HUs Entregues:** 14.1, 14.2, 14.3, 14.4, 14.5.
- **Status:** Onboarding completo, API Key segura, Múltiplos Modelos.

---

## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 15: Visualização Interativa (Próxima)
**Objetivo:** "Limpar a sujeira" da UI. Mostrar os dados reais nas abas e sidebar.
- [ ] **15.1** Árvore de Arquivos (Sidebar).
- [ ] **15.2** Renderização de HUs (Abas).
- [ ] **15.3** Visualizador de Docs/Markdown.
- [ ] **15.4** Refinamento via Chat.

### 📅 Fase 16: Persistência Real (Database)
**Objetivo:** Salvar histórico entre sessões (SQLite/Postgres).
- [ ] Persistência de Chat.
- [ ] Persistência de Projetos.

### 📅 Fase 17: Deploy & DevOps
**Objetivo:** Dockerização e CI/CD em nuvem.
