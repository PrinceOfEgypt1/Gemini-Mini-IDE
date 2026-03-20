# Gemini Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA para transformar intenções em planos e código.

> **Status:** Em desenvolvimento ativo
> **Estado oficial de referência:** `main @ 21d77f4`
> **Testes:** 39 arquivos de teste executados / 42 escritos — 3 excluídos ativamente em `analysis-agent` (ver [KNOWN_ISSUES.md](./KNOWN_ISSUES.md))
> **Contagens por arquivo de teste:** `shared: 2`, `ui: 14`, `cli: 1`, `analysis-agent: 19 executados (22 escritos)`, `server: 3`
> **Contagens por asserção (referência histórica):** `shared: ~35`, `ui: ~73`, `cli: ~25`, `analysis-agent: ~306`, `server: ~74` — revalidar após `pnpm install && pnpm test`
> **Build:** revalidar localmente com `pnpm build`
> **Pipeline:** revalidar localmente com `pnpm lint`, `pnpm typecheck`, `pnpm test` e `bash scripts/active/pipeline.sh`

## Funcionalidades atuais

1. **API Backend (Fastify):** rotas REST para análise, conversação e exportação de projetos.
2. **Motor de Análise:** 8 agentes especializados (Analysis, Product, Architect, Engine, UX, Quality, Ops, Phoenix) com governança genérica.
3. **Interface Visual:** React + Vite + Tailwind + Framer Motion com wizard de projeto, galeria de templates e histórico persistente.
4. **CLI:** interface de linha de comando para análise de prompts.
5. **Multi-modelos:** suporte a OpenAI, Anthropic, Google Gemini, DeepSeek e Ollama (local).
6. **Exportação ZIP:** download de projetos gerados com documentação e scripts.
7. **Governança de Código:** validadores genéricos (Completeness, Category, Contract, Manifest) integrados ao CI.

## Como rodar

### Pré-requisitos

- Node.js 20+
- pnpm 8+

### Setup

```bash
git clone <repo>
cd Gemini-Mini-IDE
pnpm install
```

### Backend (porta 3200)

```bash
pnpm --filter @gemini-mini-ide/server start
```

### Frontend (porta 5173)

```bash
pnpm --filter @gemini-mini-ide/ui dev
```

### CLI

```bash
node packages/cli/dist/index.js analyze "Criar um CRUD"
```

### Pipeline de validação

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
bash scripts/active/pipeline.sh
```

## Arquitetura

```text
packages/
├── analysis-agent/  # Motor de análise e governança — 22 arquivos escritos, 19 executados, 3 excluídos
├── ui/              # Frontend React + Vite + Tailwind — 14 arquivos escritos e executados
├── server/          # Backend Fastify — 3 arquivos escritos e executados
├── shared/          # Tipos e utilitários compartilhados — 2 arquivos escritos e executados
└── cli/             # Interface de linha de comando — 1 arquivo escrito e executado
```

**Nota:** as contagens acima são de **arquivos de teste**, não de asserções individuais. Contagens de asserções variam por execução e devem ser tratadas como referência histórica até nova validação local. Os 3 arquivos excluídos em `analysis-agent` estão documentados em [KNOWN_ISSUES.md](./KNOWN_ISSUES.md).

Todos os pacotes usam o namespace `@gemini-mini-ide/*`.

## Governança de código

O projeto inclui validadores genéricos para qualidade de código:

| Validador | Função |
|---|---|
| `CompletenessValidator` | Anti-lazy — detecta TODOs, FIXMEs, `any` e suppressions |
| `CategoryValidator` | Valida distribuição de categorias arquiteturais |
| `ContractValidator` | Valida que o código entrega a funcionalidade prometida |
| `ManifestValidator` | Valida a estrutura do manifesto de arquivos |
| `BaseProjectAuditor` | Injeta arquivos essenciais (`README`, `package.json`, `tsconfig`, CI) |

Esses validadores são integrados ao CI em modo blocking.

## Feature experimental: ESAA

O sistema Event-Sourced Agent Architecture (ESAA) existe no código, mas permanece desabilitado por padrão (`ESAA_ENABLED=false`). Consulte `docs/ESAA_ARCHITECTURE.md` para detalhes da arquitetura planejada.

## Limitações conhecidas

Consulte [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) para a lista completa de limitações, exclusões de teste e débitos técnicos documentados.

## Documentação

| Documento | Descrição |
|---|---|
| `DEVELOPMENT.md` | Manual de engenharia e desenvolvimento |
| `KNOWN_ISSUES.md` | Limitações e issues conhecidas |
| `docs/AI_POLICY.md` | Política de desenvolvimento com IA |
| `docs/REVIEW_CHECKLIST.md` | Checklist de code review |
| `docs/BACKLOG.md` | Backlog e roadmap do projeto |
| `docs/ESAA_ARCHITECTURE.md` | Arquitetura ESAA (experimental) |
| `FORENSIC_AUDIT_REPORT.md` | Auditoria forense do projeto |
| `REMEDIATION_REPORT.md` | Relatório histórico de recuperação |
