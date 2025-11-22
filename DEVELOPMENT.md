# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.3 (Phase 8 Done)
> **Versão do Software:** v0.8.0
> **Data:** 2025-11-22
> **Pipeline:** 🟢 Verde

---

## 1. Status das Fases

| Fase | Status | Entregáveis Recentes |
|---|---|---|
| **1-5** (Infra/MVP) | ✅ Concluído | Monorepo, CLI, UI Base. |
| **6** (UX) | ✅ Concluído | Feedback Visual, Timeline. |
| **7** (Persistência) | ✅ Concluído | Bundles em disco, Histórico. |
| **8** (Robustez) | ✅ Concluído | **Swagger**, **Budget**, **Optimizer**, **Global Error Handler**. |
| **9** (Personas) | 📅 Pendente | Especialização dos agentes. |

---

## 2. Detalhe da Fase 8 (Hardening)

Focamos em preparar o backend para produção e consumo externo.

*   **Documentação:** Swagger UI disponível em `/docs`.
*   **Economia:** `PromptOptimizer` remove gordura dos prompts; `BudgetService` impede gastos excessivos (limite diário mockado).
*   **Resiliência:** `fastify.setErrorHandler` captura exceções não tratadas e retorna JSON padronizado, evitando crash.
*   **Qualidade:** Novos testes unitários para os serviços de infraestrutura.

---

## 3. Próximos Passos (Fase 9)

Implementar a lógica das **8 Personas** no Agente de Análise para que ele deixe de dar respostas genéricas e passe a agir como um time de engenharia completo.
