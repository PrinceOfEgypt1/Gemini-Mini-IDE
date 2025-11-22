# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.1 (Phase 7 Done)
> **Versão do Software:** v0.7.0
> **Data:** 2025-11-22
> **Pipeline:** 🟢 Verde

---

## 1. Status das Fases de Desenvolvimento

| Fase | Descrição | Status | Entregáveis Chave |
|---|---|---|---|
| **1** | **Fundação e Governança** | ✅ Concluído | Monorepo, ESLint v9, Vitest, Pipeline Script. |
| **2** | **Motor de Análise (Backend)** | ✅ Concluído | Servidor Fastify, Tipos em `shared`, Logs JSON. |
| **3** | **Conectando o Cérebro (IA)** | ✅ Concluído | Agente, Provider Pattern, Mock/DeepSeek. |
| **4** | **Primeira Interface (CLI)** | ✅ Concluído | CLI funcional validando fluxo ponta a ponta. |
| **5** | **Interface Visual (UI Shell)** | ✅ Concluído | React + Vite, Proxy, Layout Base. |
| **6** | **Refinamento e UX** | ✅ Concluído | Componentização, Toasts, Loading States, Testes UI. |
| **7** | **Persistência e Histórico** | ✅ Concluído | `PersistenceService`, Bundles em disco, Histórico na UI. |
| **8** | **Robustez do Backend** | 📅 Pendente | OpenAPI, Budget Check, RunId. |

---

## 2. Histórias de Usuário (HUs) Entregues Recentemente

### Fase 7: Persistência e Histórico
- **HU-Persistence-Bundles (6.1):** Implementado `PersistenceService` salvando JSONs em `packages/server/bundles/`.
- **HU-Persistence-Logs (6.3):** Logs configurados com rotação via `pino-roll`.
- **HU-UI-Analyze-Result-History (13.5):** Componente `HistoryPanel` na UI consumindo `GET /analyze/history`.

*(Para histórico completo das fases 1-6, consulte versões anteriores deste documento)*

---

## 3. Roadmap Futuro (Fases 8+)

### 📅 Fase 8: Robustez do Backend (Hardening)
**Objetivo:** Controle de erros, custos e documentação.
- [ ] **1.3** HU-Server-Analyze-500
- [ ] **1.6** HU-Server-OpenAPI
- [ ] **2.1** HU-Analysis-CompactPrompt
- [ ] **2.2** HU-Analysis-Budget-Check
- [ ] **2.4** HU-Analysis-RunId
- [ ] **12.2** HU-Server-Budget-Per-Context

### 📅 Fase 9: Orquestração de Personas
- [ ] **3.2 a 3.9** Implementação das 8 Personas especializadas.

### 📅 Fase 10: Fluxo de Engenharia (Wizard)
- [ ] **9.6** HU-UI-Project-Creation-006
- [ ] **10.4** HU-MINI-IDE-Env-004 (Scripts Bash)

---
