# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 9.1 (Traceability Fix)
> **Versão do Software:** v0.15.0 (AI Powered)
> **Data:** 2025-11-24
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico)

*(Fases 1 a 11 omitidas para brevidade neste script, mas assuma que estão aqui como no anterior)*
### ✅ Fase 1: Fundação e Governança
- **HUs:** 11.3, 5.4.

### ✅ Fase 2: Motor de Análise (Backend Core)
- **HUs:** 1.1, 1.2, 1.4, 1.5, 1.7.

### ✅ Fase 3: Inteligência Artificial
- **HUs:** 2.3, 3.1, 3.10, 12.3.

### ✅ Fase 4: Interface CLI
- **HUs:** 7.1, 7.2.

### ✅ Fase 5: Interface Visual (UI Shell)
- **HUs:** 9.1, 9.4, 13.1, 13.2, 13.3.

### ✅ Fase 6: Refinamento e UX
- **HUs:** 9.2, 9.3, 9.9, 9.10, 9.11, 9.12, 9.13, 9.16, 9.17, 13.4.

### ✅ Fase 7: Persistência e Histórico
- **HUs:** 6.1, 6.2, 6.3, 13.5.

### ✅ Fase 8: Robustez do Backend (Hardening)
- **HUs:** 1.3, 1.6, 2.1, 2.2, 2.4, 12.2.

### ✅ Fase 9: Orquestração de Personas (O Cérebro)
- **HUs:** 3.2 a 3.9.

### ✅ Fase 10: Fluxo de Engenharia (Wizard)
- **HUs:** 9.6, 10.1 a 10.4, 10.7.

### ✅ Fase 11: Consolidação e Exportação (A Fábrica)
- **HUs Entregues:** 4.1, 4.2, 4.3, 4.6, 8.3, 9.5.

### ✅ Fase 12: Experiência do Usuário & Segurança (Produto)
**Objetivo:** Transformar a ferramenta técnica em um produto amigável e seguro.
- **Artefatos:** `tour.ts`, `HelpModal.tsx`, `QuickStartGallery.tsx`, `secure_apikey_flow.sh`.
- **HUs Entregues (Originais):** 14.1, 14.2, 14.3, 14.4, 14.5.
- **Nota de Governança:** As HUs desta fase (série 14.x) foram **migradas** para os Épicos 8, 9, 11 e 12 no Backlog oficial para manter a organização temática. (Ver seção 14 do Backlog).

### ✅ Fase 13: Acessibilidade e Polimento Visual
**Objetivo:** Sistema de Temas (Dark/Light) e refinamentos.
- **Artefatos:** `ThemeContext.tsx`, `tailwind.config.js` (v3), `App.tsx` (Header Toggle).
- **HUs:** 9.8 (Temas), 9.14 (Teclado parcial), 9.18 (Micro-interações).

### ✅ Fase 14: Inteligência Real (O Cérebro)
**Objetivo:** Conectar Backend à OpenAI/DeepSeek com segurança.
- **Artefatos:** `agent.ts` (Integração SDK), `server/src/index.ts` (Dry-Run, CORS).
- **HUs:** 12.7, 14.6, 14.7, 14.8.

---

## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 15: Visualização Interativa (Foco Atual)
**Objetivo:** Substituir "Em breve" por dados reais na UI (Sidebar e Abas).
- [ ] **15.1** Árvore de Arquivos Dinâmica (Sidebar).
- [ ] **15.2** Renderização de HUs (Aba HUs).
- [ ] **15.3** Visualizador Markdown (Aba Docs).
- [ ] **15.4** Loop de Refinamento via Chat.

### 📅 Fase 16: Persistência Real
**Objetivo:** Banco de Dados (SQLite/Postgres) para salvar histórico.

### 📅 Fase 17: Deploy & DevOps
**Objetivo:** Docker e CI/CD em nuvem.
