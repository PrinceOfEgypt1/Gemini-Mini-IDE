# Mini-IDE — DEVELOPMENT.md

> **Versão Lógica:** v0.5.0 (Fase 5 Concluída)
> **Data:** 2025-11-22
> **Estado:** Backend conectado à UI e CLI. Pipeline Verde.

---

## 1. Status das Fases de Desenvolvimento

| Fase | Descrição | Status | Entregáveis |
|---|---|---|---|
| **1** | **Fundação e Governança** | ✅ Concluído | Monorepo, ESLint v9, Vitest, Pipeline Script. |
| **2** | **Motor de Análise (Backend)** | ✅ Concluído | Servidor Fastify, Tipos em `shared`, Logs JSON. |
| **3** | **Conectando o Cérebro (IA)** | ✅ Concluído | Agente, Provider Pattern, Mock Provider, DeepSeek Client. |
| **4** | **Primeira Interface (CLI)** | ✅ Concluído | Comando `analyze`, integração HTTP com Server. |
| **5** | **Interface Visual (UI)** | ✅ Concluído | React + Vite, Proxy, Layout 3 Colunas, Chat Integrado. |
| **6** | **Refinamento e UX** | ⏳ Pendente | Feedback visual rico, tratamento de erros, persistência local. |

---

## 2. Histórias de Usuário (HUs) Entregues

### Fase 1: Fundação
- **HU-Gov-Docs-Minimas (11.3):** README e DEVELOPMENT iniciais criados.
- **HU-Quality-Pipeline-Checklist (5.4):** Script `42_pipeline_checklist.sh` implementado e bloqueante.

### Fase 2: Backend Core
- **HU-Server-Analyze-200 (1.1):** Endpoint `/analyze` funcional.
- **HU-Server-Healthz (1.4):** Endpoint `/healthz` funcional.
- **HU-Server-Logging-JSON (1.5):** Logs estruturados implementados no Fastify.
- **HU-Server-Analyze-Shape-Contract (1.7):** Tipos `AnalyzeRequest` e `AnalyzeResponse` definidos em `@mini-ide/shared`.

### Fase 3: Inteligência
- **HU-LLM-Client-DeepSeek (3.1):** Provider DeepSeek implementado (com fallback para Mock).
- **HU-Analysis-Context (2.3):** Estrutura básica de prompt implementada no Agente.

### Fase 4: CLI
- **HU-CLI-Analyze (7.1):** Comando `analyze` implementado lendo arquivos/texto.

### Fase 5: UI Shell
- **HU-UI-Explore-Mode-001 (9.1):** Layout "Explore Workspace" (3 colunas) implementado.
- **HU-UI-Server-BaseURL-Config (13.1):** Proxy do Vite configurado para `http://localhost:3200`.
- **HU-UI-Analyze-Playground (13.3):** Chat funcional conectado ao endpoint `/analyze`.

---

## 3. Arquitetura Atual

```mermaid
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
```

## 4. Próximos Passos (Fase 6)

1.  **Polimento de UX:** Adicionar *spinners* reais nos botões enquanto aguarda o backend.
2.  **Discovery Notes Dinâmicas:** Fazer o painel lateral reagir ao JSON retornado pelo agente.
3.  **Tratamento de Erros:** Toasts para falhas de conexão.
