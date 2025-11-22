# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.2 (Pos-Fase 7)
> **Versão do Software:** v0.7.0
> **Data:** 2025-11-22

---

## 1. Mapa de Fases e Entregas Técnicas

### ✅ Fase 1: Fundação e Governança
*Objetivo: Setup do monorepo e pipeline.*
- **Artefatos:** `pnpm-workspace.yaml`, `tsconfig.base.json`, `42_pipeline_checklist.sh`.
- **HUs:** 11.3, 5.4.

### ✅ Fase 2: Motor de Análise (Backend Core)
*Objetivo: API HTTP e Contratos.*
- **Artefatos:** `server/src/index.ts`, `shared/src/types/*.ts`.
- **HUs:** 1.1, 1.2, 1.4, 1.5, 1.7.

### ✅ Fase 3: Inteligência Artificial
*Objetivo: Integração LLM.*
- **Artefatos:** `analysis-agent/src/providers/*`, `analysis-agent/src/index.ts`.
- **HUs:** 2.3, 3.1, 3.10, 12.3.

### ✅ Fase 4: Interface CLI
*Objetivo: MVP via terminal.*
- **Artefatos:** `cli/src/index.ts`.
- **HUs:** 7.1, 7.2.

### ✅ Fase 5: Interface Visual (UI Shell)
*Objetivo: Estrutura React.*
- **Artefatos:** `ui/src/App.tsx`, `ui/vite.config.ts`.
- **HUs:** 9.1, 9.4, 13.1, 13.2, 13.3.

### ✅ Fase 6: Refinamento e UX
*Objetivo: Interatividade e Feedback.*
- **Artefatos:** `ToastContext.tsx`, `Button.tsx`, `ExploreTimeline.tsx`, `DiscoveryNotes.tsx`.
- **HUs:** 9.2, 9.3, 9.9, 9.10, 9.11, 9.12, 9.13, 9.16, 9.17, 13.4.

### ✅ Fase 7: Persistência e Histórico
*Objetivo: Salvar dados em disco e histórico.*
- **Artefatos:** 
    - `server/src/services/persistence.ts`: Gerenciador de FS.
    - `ui/src/components/analyze/HistoryPanel.tsx`: UI de Histórico.
    - `packages/server/bundles/`: Diretório de armazenamento.
- **HUs:** 6.1, 6.2, 6.3, 13.5.

---

## 2. Planejamento Futuro (Fases 8-14)

Consulte o arquivo `docs/BACKLOG.md` para o status detalhado de cada HU restante.

### 📅 Próxima: Fase 8 - Robustez do Backend
Foco em documentação automática (OpenAPI), rastreabilidade (RunID) e controle de orçamento.

