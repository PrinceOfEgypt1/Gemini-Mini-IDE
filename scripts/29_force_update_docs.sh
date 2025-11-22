#!/usr/bin/env bash
set -e

echo "📚 Forçando atualização final da documentação (v0.6.0)..."

# 1. Atualizar README.md para v0.6.0 (Fase 6)
# -----------------------------------------------------
cat > README.md <<EOF
# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.6.0 (Beta UI) - UI Refinada + Feedback Visual + Backend Core
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

- **@mini-ide/server**: Backend Fastify + Integração com Agente.
- **@mini-ide/ui**: Interface React + Vite (Explore Workspace).
- **@mini-ide/analysis-agent**: Lógica de IA, Personas e Providers.
- **@mini-ide/shared**: Contratos de API e Tipos TypeScript.
- **@mini-ide/cli**: Ferramenta de terminal.

## 🛡️ Qualidade e CI
Antes de commitar, execute o guardião:
\`\`\`bash
./42_pipeline_checklist.sh
\`\`\`
EOF

# 2. Garantir que o DEVELOPMENT.md mantém o Plano Completo (v4.0)
# (Reaplicando o conteúdo do script 28 para garantir consistência)
# -----------------------------------------------------
cat > DEVELOPMENT.md <<EOF
# Mini-IDE — DEVELOPMENT.md

> **Versão do Documento:** 4.0 (Full Scope)
> **Versão do Software:** v0.6.0 (Fase 6 Concluída)
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde

---

# 🗺️ Plano de Desenvolvimento Mestre (78 HUs)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 🟢 1. Fases Concluídas

### **Fase 1: Fundação e Governança** (✅ Concluído)
- Infraestrutura Monorepo, Scripts de CI, Documentação inicial.

### **Fase 2: Motor de Análise** (✅ Concluído)
- Servidor Fastify, Contratos TypeScript, Logs JSON.

### **Fase 3: Inteligência Artificial** (✅ Concluído)
- Agente, Mock Provider, Cliente DeepSeek.

### **Fase 4: Interface CLI** (✅ Concluído)
- Comando \`analyze\`, feedback no terminal.

### **Fase 5: Interface Visual** (✅ Concluído)
- Layout React, Proxy, Chat básico.

### **Fase 6: Refinamento e UX** (✅ Concluído)
- **HU-UI-Explore-Interactions-012:** Feedback Visual Universal.
- **HU-UI-Explore-Loading-States-017:** Skeletons e Spinners.
- **HU-UI-Explore-Error-Handling-016:** Tratamento de erros.
- **HU-UI-Discovery-Notes-002:** Componente DiscoveryNotes estruturado.
- **HU-UI-Timeline-003:** Componente Timeline.
- **HU-UI-Tabs-004:** Navegação por abas.

---

## 🔴 2. Fases Futuras (Backlog)

### **Fase 7: Persistência e Histórico**
- [ ] Bundles, Logs, Histórico na UI.

### **Fase 8: Robustez do Backend**
- [ ] OpenAPI, Budget Check, RunId.

### **Fase 9: Orquestração de Personas**
- [ ] Implementação das 8 Personas especializadas.

### **Fase 10: Fluxo de Engenharia (Wizard)**
- [ ] Geração de HUs, Scripts de Ambiente, Criação de Projeto.

### **Fase 11: Consolidação e Exportação**
- [ ] Parser JSON, Exportação .zip/.md.

### **Fase 12: CLI Avançada**
- [ ] Configurações persistentes, Workspaces.

### **Fase 13: Acessibilidade e Polimento**
- [ ] Temas, Navegação por Teclado, WCAG.

### **Fase 14: Hardening e Produção**
- [ ] CI/CD GitHub Actions, Métricas, Release Scripts.

---
EOF

echo "✅ Documentação corrigida e sincronizada (v0.6.0)."
