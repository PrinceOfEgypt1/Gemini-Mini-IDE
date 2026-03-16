# Gemini Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA para transformar intenções em planos e código.

> **Status:** Em desenvolvimento ativo
> **Testes:** 513 passando (vitest) — shared:35, ui:73, cli:25, analysis-agent:306, server:74
> **Build:** Todos os pacotes compilam com sucesso (`pnpm build`)
> **Pipeline:** lint, typecheck, build e test verdes

## Funcionalidades Atuais

1. **API Backend (Fastify):** Rotas REST para análise, conversação e exportação de projetos.
2. **Motor de Análise:** 8 agentes especializados (Analysis, Product, Architect, Engine, UX, Quality, Ops, Phoenix) com governança genérica.
3. **Interface Visual:** React + Vite + Tailwind + Framer Motion com wizard de projeto, galeria de templates e histórico persistente.
4. **CLI:** Interface de linha de comando para análise de prompts.
5. **Multi-Modelos:** Suporte a OpenAI, Anthropic, Google Gemini, DeepSeek e Ollama (local).
6. **Exportação ZIP:** Download de projetos gerados com documentação e scripts.
7. **Governança de Código:** Validators genéricos (Completeness, Category, Contract, Manifest) integrados ao CI.

## Como Rodar

### Pré-requisitos

- Node.js 20+
- pnpm 8+

### Setup

```bash
git clone <repo>
cd Gemini-Mini-IDE
pnpm install
```

### 1. Backend (porta 3200)

```bash
pnpm --filter @gemini-mini-ide/server start
```

### 2. Frontend (porta 5173)

```bash
pnpm --filter @gemini-mini-ide/ui dev
```

### 3. CLI

```bash
node packages/cli/dist/index.js analyze "Criar um CRUD"
```

### Pipeline de Validação

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
bash scripts/active/pipeline.sh
```

## Arquitetura

```
packages/
├── analysis-agent/  # Motor de análise e governança (306 testes)
├── ui/              # Frontend React + Vite + Tailwind (73 testes)
├── server/          # Backend Fastify (74 testes)
├── shared/          # Tipos e utilitários compartilhados (35 testes)
└── cli/             # Interface de linha de comando (25 testes)
```

Todos os pacotes usam namespace `@gemini-mini-ide/*`.

## Governança de Código

O projeto inclui validadores genéricos para qualidade de código:

| Validador | Função |
|-----------|--------|
| `CompletenessValidator` | Anti-lazy — detecta TODOs, FIXMEs, any types, suppressions |
| `CategoryValidator` | Valida distribuição de categorias arquiteturais |
| `ContractValidator` | Valida que código entrega funcionalidade prometida |
| `ManifestValidator` | Valida estrutura de manifesto de arquivos |
| `BaseProjectAuditor` | Injeta arquivos essenciais (README, package.json, tsconfig, CI) |

Estes validadores são integrados ao CI em modo blocking.

## Feature Experimental: ESAA

O sistema Event-Sourced Agent Architecture (ESAA) existe no código mas está **desabilitado por padrão** (`ESAA_ENABLED=false`). Consulte `docs/ESAA_ARCHITECTURE.md` para detalhes da arquitetura planejada.

## Limitações Conhecidas

Consulte [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) para lista completa de limitações e exclusões de teste.

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Manual de engenharia e desenvolvimento |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Limitações e issues conhecidas |
| [docs/AI_POLICY.md](./docs/AI_POLICY.md) | Política de desenvolvimento com IA |
| [docs/REVIEW_CHECKLIST.md](./docs/REVIEW_CHECKLIST.md) | Checklist de code review |
| [docs/BACKLOG.md](./docs/BACKLOG.md) | Backlog e roadmap do projeto |
| [docs/ESAA_ARCHITECTURE.md](./docs/ESAA_ARCHITECTURE.md) | Arquitetura ESAA (experimental) |
| [FORENSIC_AUDIT_REPORT.md](./FORENSIC_AUDIT_REPORT.md) | Auditoria forense do projeto |
| [REMEDIATION_REPORT.md](./REMEDIATION_REPORT.md) | Relatório histórico de recuperação |
