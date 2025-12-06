# Gemini Mini-IDE (Monorepo)

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

### 🆕 Novidades da Versão v0.11.0
- **Exportação de Projetos (.zip):** Baixe todo o código gerado, documentação e scripts em um clique.
- **Painel de Configurações:** Configure sua API Key (DeepSeek/OpenAI) diretamente na interface.
- **Backend Estabilizado:** Correção completa de dependências Fastify e Pipeline de CI local.

### 🆕 Novidades da Versão v0.12.0 (UX & Security)
- **Tour Guiado:** Um passo a passo interativo para novos usuários.
- **Galeria de Templates:** Comece rápido com *API Node*, *React Dashboard*, *Python Script* e mais.
- **Manual Integrado:** Documentação completa de uso sem sair da aplicação.
- **Segurança de Verdade:** Sua API Key agora trafega via Headers HTTP seguros e nunca é logada.
- **Multi-Modelos:** Suporte nativo para OpenAI, Anthropic, Google Gemini, DeepSeek e **Ollama (Local)**.
- **Inteligência Local:** O sistema entende intenções, requisitos e restrições em tempo real enquanto você digita.

### 🚀 Versão v0.15.0 (AI Powered)
- **Inteligência Real:** O sistema agora se conecta a LLMs reais (GPT-4, DeepSeek) para gerar código.
- **Exportação Funcional:** Gere e baixe projetos completos em ZIP.
- **Segurança:** Gestão de chaves via Headers HTTP seguros.
- **Temas:** Suporte nativo a Dark e Light mode.
