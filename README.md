# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Versão:** v0.7.0 (Beta Persistence)
> **Status:** ✅ Fase 7 Concluída (Persistência e Histórico)
> **Pipeline:** 🟢 Passing (Lint, Types, Tests, Build, Smoke)

## 🚀 Funcionalidades Ativas
1. **Chat Inteligente:** Converse com o agente para definir requisitos (Mock/DeepSeek).
2. **Exploração Visual:** Interface de 3 colunas (Sidebar, Tabs, Discovery Notes).
3. **Persistência:** Todo histórico de análise é salvo em disco (`bundles/`).
4. **Timeline:** Acompanhe a evolução do projeto cronologicamente.
5. **CLI:** Interface de linha de comando completa.

## 🛠️ Como Rodar o Sistema Completo

Este é um monorepo. Você precisará de terminais separados.

### Terminal 1: O Cérebro (Backend)
Roda na porta 3200. Salva dados em `packages/server/bundles`.
```bash
# Opcional: export DEEPSEEK_API_KEY="sua-chave"
pnpm --filter @mini-ide/server start
```

### Terminal 2: A Interface (Frontend)
Roda na porta 5173. Abre no navegador.
```bash
pnpm --filter @mini-ide/ui dev
```

### Terminal 3: Ferramentas (CLI)
Use para análises rápidas sem abrir o navegador.
```bash
node packages/cli/dist/index.js analyze "Criar um CRUD de usuários"
```

## 🏗 Estrutura
- **@mini-ide/server**: Fastify, Persistência (FS), Integração IA.
- **@mini-ide/ui**: React, Vite, Tailwind-like CSS, Context API.
- **@mini-ide/analysis-agent**: Orquestrador de Personas.
- **@mini-ide/shared**: Tipos TypeScript (Contratos de API).
- **@mini-ide/cli**: Ferramenta de automação via terminal.

## 🛡️ Governança e Qualidade
Nenhum commit entra sem passar pelo guardião:
```bash
./42_pipeline_checklist.sh
```
