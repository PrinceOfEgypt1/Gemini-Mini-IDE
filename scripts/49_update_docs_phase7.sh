#!/usr/bin/env bash
set -e

echo "📚 Atualizando documentação para v0.7.0 (Fase 7 Concluída)..."

# 1. Atualizar README.md
cat > README.md <<EOF
# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.7.0 (Beta Persistence) - Persistência de Dados + Histórico + UI Refinada
> **Pipeline:** 🟢 Passing (Lint, Types, Tests, Build, Smoke)

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
A UI visual para exploração, chat e visualização de planos.
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

- **@mini-ide/server**: Backend Fastify + Persistência em Disco.
- **@mini-ide/ui**: Interface React + Vite.
- **@mini-ide/analysis-agent**: Lógica de IA e Providers.
- **@mini-ide/shared**: Contratos de API.
- **@mini-ide/cli**: Ferramenta de terminal.

## 🛡️ Qualidade e CI
Antes de commitar, execute o guardião:
\`\`\`bash
./42_pipeline_checklist.sh
\`\`\`
EOF

# 2. Atualizar DEVELOPMENT.md
# Mantendo o plano completo, mas atualizando o status da Fase 7
cat > DEVELOPMENT.md <<EOF
# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.1 (Phase 7 Done)
> **Versão do Software:** v0.7.0
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde

---

## 1. Status das Fases de Desenvolvimento

| Fase | Descrição | Status | Entregáveis Chave |
|---|---|---|---|
| **1** | **Fundação e Governança** | ✅ Concluído | Monorepo, ESLint v9, Vitest, Pipeline Script. |
| **2** | **Motor de Análise (Backend)** | ✅ Concluído | Servidor Fastify, Tipos em \`shared\`, Logs JSON. |
| **3** | **Conectando o Cérebro (IA)** | ✅ Concluído | Agente, Provider Pattern, Mock/DeepSeek. |
| **4** | **Primeira Interface (CLI)** | ✅ Concluído | CLI funcional validando fluxo ponta a ponta. |
| **5** | **Interface Visual (UI Shell)** | ✅ Concluído | React + Vite, Proxy, Layout Base. |
| **6** | **Refinamento e UX** | ✅ Concluído | Componentização, Toasts, Loading States, Testes UI. |
| **7** | **Persistência e Histórico** | ✅ Concluído | \`PersistenceService\`, Bundles em disco, Histórico na UI. |
| **8** | **Robustez do Backend** | 📅 Pendente | OpenAPI, Budget Check, RunId. |

---

## 2. Histórias de Usuário (HUs) Entregues Recentemente

### Fase 7: Persistência e Histórico
- **HU-Persistence-Bundles (6.1):** Implementado \`PersistenceService\` salvando JSONs em \`packages/server/bundles/\`.
- **HU-Persistence-Logs (6.3):** Logs configurados com rotação via \`pino-roll\`.
- **HU-UI-Analyze-Result-History (13.5):** Componente \`HistoryPanel\` na UI consumindo \`GET /analyze/history\`.

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
EOF

echo "✅ Documentação atualizada para v0.7.0."
