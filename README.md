# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.10.1 (Hardened Backend) - API Documentada + Controle de Custos + UI Beta
> **Pipeline:** 🟢 Passing (Lint, Types, Tests, Build, Smoke)

## 🚀 Funcionalidades Principais
1. **API Robusta:** Documentação Swagger (/docs), Tratamento de Erros, Validação.
2. **Inteligência:** Otimização de prompts e Controle de Orçamento.
3. **Interface Visual:** React + Vite com histórico persistente.
4. **Persistência:** Sistema de arquivos e logs de auditoria.

## 🛠️ Como Rodar

### 1. Iniciar o Cérebro (Backend)
Porta 3200. Swagger em http://localhost:3200/docs
```bash
# Terminal 1
export DEEPSEEK_API_KEY="sua-chave" # Opcional
pnpm --filter @mini-ide/server start
```

### 2. Iniciar a Interface (Frontend)
Porta 5173.
```bash
# Terminal 2
pnpm --filter @mini-ide/ui dev
```

### 3. CLI
```bash
# Terminal 3
node packages/cli/dist/index.js analyze "Criar um CRUD"
```
