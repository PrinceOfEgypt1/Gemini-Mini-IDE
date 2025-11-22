# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.6.0 (Beta UI) - UI Refinada + Feedback Visual + Backend Core
> **Pipeline:** 🟢 Passing (Lint, Types, Tests, Build, Smoke)

## 🚀 Como Rodar

Este é um monorepo. Você precisará de terminais separados para rodar o sistema completo.

### 1. Iniciar o Cérebro (Backend)
O servidor expõe a API e orquestra o agente de IA.
```bash
# Terminal 1
# Roda na porta 3200
export DEEPSEEK_API_KEY="sua-chave" # Opcional (sem chave usa Mock)
pnpm --filter @mini-ide/server start
```

### 2. Iniciar a Interface (Frontend)
A UI visual para exploração, chat e visualização de planos.
```bash
# Terminal 2
# Roda na porta 5173 (abre no navegador)
pnpm --filter @mini-ide/ui dev
```

### 3. Usar via Linha de Comando (CLI)
Ferramenta para uso rápido via terminal.
```bash
# Terminal 3
node packages/cli/dist/index.js analyze "Quero criar um sistema de login"
```

## 🏗 Estrutura do Monorepo

- **@mini-ide/server**: Backend Fastify + Integração com Agente.
- **@mini-ide/ui**: Interface React + Vite (Explore Workspace).
- **@mini-ide/analysis-agent**: Lógica de IA, Personas e Providers.
- **@mini-ide/shared**: Contratos de API e Tipos TypeScript.
- **@mini-ide/cli**: Ferramenta de terminal.

## 🛡️ Qualidade e CI
Antes de commitar, execute o guardião:
```bash
./42_pipeline_checklist.sh
```
