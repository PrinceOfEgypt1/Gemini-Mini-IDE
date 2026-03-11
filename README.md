# Gemini Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA para transformar intenções em planos e código.

> **Status:** Em desenvolvimento ativo
> **Testes:** 176 passando (vitest) - cli:1, shared:1, ui:17, analysis-agent:155, server:2
> **Build:** Todos os pacotes compilam com sucesso (pnpm build)

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
pnpm --filter @gemini-mini-ide/server start
```

### 2. Iniciar a Interface (Frontend)
Porta 5173.
```bash
# Terminal 2
pnpm --filter @gemini-mini-ide/ui dev
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

### Versão Atual
- Integração com LLMs (GPT-4, DeepSeek, Gemini) para geração de código
- Exportação de projetos em ZIP
- Temas Dark/Light
- UI com Framer Motion para animações suaves

## Limitações Conhecidas

Consulte [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) para lista completa de:
- Testes excluídos e suas razões
- Issues de build no analysis-agent (resolvidos em Rodada 4/5)

## Arquitetura

```
packages/
├── ui/            # Frontend React + Vite + Framer Motion
├── server/        # Backend Fastify
├── cli/           # Interface de linha de comando
├── shared/        # Tipos e utilitários compartilhados
└── analysis-agent/# Motor de análise e geração de código
```

## Governança de Código

O projeto inclui validadores para qualidade de código:
- **CompletenessValidator**: Detecta TODOs, FIXMEs, any types, suppressions
- **CategoryValidator**: Valida estrutura de manifesto
- **BaseProjectAuditor**: Audita e corrige projetos gerados

Estes validadores são integrados ao CI em modo blocking.
