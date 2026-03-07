# Scripts do Gemini Mini-IDE

## Estrutura

```
scripts/
├── active/          # Scripts aprovados para uso
├── legacy/          # Scripts antigos mantidos para referência
├── quarantine/      # Scripts perigosos - NÃO EXECUTAR
└── README.md        # Este arquivo
```

## Política de Scripts

### Scripts Ativos (`active/`)
- Apenas scripts revisados e aprovados
- Não podem usar `cat >` para sobrescrever arquivos críticos
- Devem ter documentação de uso
- Devem criar backup antes de modificações

### Scripts em Quarentena (`quarantine/`)
- 329 scripts legados movidos para quarentena
- Contêm `cat >` que pode sobrescrever arquivos críticos
- **NÃO DEVEM SER EXECUTADOS** sem revisão prévia
- Mantidos apenas para referência histórica

## Arquivos Críticos (Protegidos)

Os seguintes arquivos NÃO devem ser sobrescritos por scripts:

- `packages/analysis-agent/src/agent.ts`
- `packages/analysis-agent/src/governance/*.ts`
- `packages/analysis-agent/src/validators/*.ts`
- `packages/server/src/index.ts`
- `packages/ui/src/App.tsx`
- `packages/*/package.json`
- `tsconfig.*.json`

## Comandos Seguros

Use os comandos do pnpm em vez de scripts:

```bash
pnpm lint       # Verificar código
pnpm typecheck  # Verificar tipos
pnpm test       # Executar testes
pnpm build      # Construir projeto
pnpm dev        # Iniciar dev server
```

## Histórico

- **2026-03-07**: 329 scripts movidos para quarentena
- Razão: Uso massivo de `cat >` representa risco de destruição de código
