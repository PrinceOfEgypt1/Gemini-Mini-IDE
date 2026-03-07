# FASE 0 — MAPA DO REPOSITÓRIO E PLANO EXECUTIVO

**Data**: 2026-03-07
**Status**: CONCLUÍDO
**Pipeline Atual**: FAILING (lint com 3 warnings)

---

## 1. ESTRUTURA DO REPOSITÓRIO

```
Gemini-Mini-IDE/
├── packages/
│   ├── analysis-agent/    # Core de geração de código (100 arquivos .ts)
│   ├── cli/               # Interface de linha de comando
│   ├── server/            # Backend Fastify
│   ├── shared/            # Tipos compartilhados
│   └── ui/                # Frontend React
├── scripts/               # 256 scripts shell (65K linhas) ⚠️ CRÍTICO
├── docs/                  # Documentação
├── bundles/               # Artefatos de build
└── [configs raiz]
```

---

## 2. INVENTÁRIO DE MÓDULOS

### 2.1 Arquivos Críticos (PATRIMÔNIO DO SISTEMA)

| Arquivo | Linhas | Criticidade | Status |
|---------|--------|-------------|--------|
| `analysis-agent/src/agent.ts` | 1171 | CRÍTICA | Funcional |
| `analysis-agent/src/governance/contract-validator.ts` | 435 | ALTA | Funcional |
| `analysis-agent/src/governance/completeness-validator.ts` | 179 | ALTA | Funcional |
| `analysis-agent/src/validators/manifest-validator.ts` | 62 | MÉDIA | GUTTED |
| `analysis-agent/src/validators/integrity-validator.ts` | 120 | ALTA | Funcional |
| `server/src/index.ts` | ~300 | ALTA | Funcional |
| `ui/src/App.tsx` | ~400 | ALTA | Funcional |

### 2.2 Contagem de Arquivos

| Categoria | Quantidade |
|-----------|------------|
| Arquivos fonte (.ts/.tsx) | 271 |
| Arquivos de teste | 14 |
| Scripts shell | 256 |
| **Ratio teste/fonte** | **5.2%** ⚠️ CRÍTICO |

---

## 3. PROBLEMAS CONFIRMADOS

### 3.1 Drift de Nomenclatura (CONFIRMADO)

| Localização | Nome Usado | Esperado |
|-------------|------------|----------|
| root package.json (scripts) | `@mini-ide/ui` | `@gemini-mini-ide/ui` |
| root package.json (scripts) | `@mini-ide/server` | `@gemini-mini-ide/server` |
| tsconfig.base.json (paths) | `@mini-ide/*` | `@gemini-mini-ide/*` |
| packages/*/package.json | `@gemini-mini-ide/*` | CORRETO |

**IMPACTO**: Scripts `pnpm dev` e `pnpm start` podem falhar ou usar resolução errada.

### 3.2 Scripts Shell Perigosos (CONFIRMADO)

| Métrica | Valor |
|---------|-------|
| Total de scripts | 256 |
| Total de linhas | 65.229 |
| Scripts com `cat >` | 256 (100%) |
| Maior script | `fix_mini_ide.sh` (1.625 linhas) |

**RISCO**: Qualquer script pode sobrescrever arquivos críticos sem proteção.

### 3.3 Ausência de CI/CD (CONFIRMADO)

- Não existe diretório `.github/`
- Não existe `workflows/`
- Pipeline é apenas local (`42_pipeline_checklist.sh`)

### 3.4 Cobertura de Testes Insuficiente (CONFIRMADO)

| Package | Testes | Status |
|---------|--------|--------|
| analysis-agent | 7 arquivos, 115 testes | ✅ |
| server | 1 arquivo, 2 testes triviais | ⚠️ INSUFICIENTE |
| ui | 0 testes executando | ❌ |
| shared | 1 arquivo | ✅ |
| cli | 1 arquivo | ✅ |

### 3.5 Lint Falhando (CONFIRMADO)

```
packages/ui: 3 warnings (max: 0)
- AppRefactored.tsx: unused 'GeneratedProject'
- AppRefactored.tsx: unused 'handleKeyDown'
- MainContent.tsx: unused 'onFileSelect'
```

### 3.6 Governança Técnica Perdida (CONFIRMADO)

| Componente | Antes | Depois | Status |
|------------|-------|--------|--------|
| ProjectTypeDetector | 533 linhas | 0 | REMOVIDO (correto - overfitting) |
| StructureAuditor | 665 linhas | 0 | REMOVIDO (parcialmente incorreto) |
| ManifestValidator | 459 linhas | 62 linhas | GUTTED |
| Injeção de arquivos básicos | Sim | Não | PERDIDO |
| Validação de categorias | Sim | Não | PERDIDO |

---

## 4. DIAGNÓSTICOS ANTERIORES - CONFIRMAÇÃO

### 4.1 Diagnóstico A (Governança)
| Afirmação | Status |
|-----------|--------|
| Governança criticamente comprometida | ✅ CONFIRMADO |
| Ausência de enforcement real | ✅ CONFIRMADO |
| Forte uso de scripts shell destrutivos | ✅ CONFIRMADO |
| Risco de mutilação silenciosa | ✅ CONFIRMADO |
| Lacunas em testes | ✅ CONFIRMADO |

### 4.2 Diagnóstico B (Técnico Revisado)
| Afirmação | Status |
|-----------|--------|
| Remoção de overfitting parcialmente correta | ✅ CONFIRMADO |
| Execução bruta e pouco granular | ✅ CONFIRMADO |
| Parte de mecanismos gerais perdida | ✅ CONFIRMADO |
| Existem substituições parciais | ✅ CONFIRMADO |

---

## 5. BACKLOG EXECUTIVO DE CORREÇÃO

### PRIORIDADE CRÍTICA (P0)

| ID | Tarefa | Risco se não feito |
|----|--------|-------------------|
| P0.1 | Corrigir drift de nomenclatura @mini-ide → @gemini-mini-ide | Scripts falham |
| P0.2 | Corrigir lint warnings no UI | Pipeline quebrado |
| P0.3 | Quarentenar scripts perigosos | Destruição silenciosa |
| P0.4 | Implementar CI/CD básico | Sem gate de qualidade |

### PRIORIDADE ALTA (P1)

| ID | Tarefa | Risco se não feito |
|----|--------|-------------------|
| P1.1 | Reimplementar injeção de arquivos básicos (genérica) | Projetos incompletos |
| P1.2 | Reimplementar validação de categorias (genérica) | Arquitetura pobre |
| P1.3 | Criar CODEOWNERS e templates | Revisão fraca |
| P1.4 | Expandir testes do server | Cobertura <6% |

### PRIORIDADE MÉDIA (P2)

| ID | Tarefa | Risco se não feito |
|----|--------|-------------------|
| P2.1 | Fortalecer ContractValidator | Contratos fracos |
| P2.2 | Adicionar testes multi-prompt | Overfitting residual |
| P2.3 | Quality gates com thresholds | Regressão silenciosa |
| P2.4 | Design system documentado | UX inconsistente |

### PRIORIDADE BAIXA (P3)

| ID | Tarefa | Risco se não feito |
|----|--------|-------------------|
| P3.1 | Motion system refinado | UX não-premium |
| P3.2 | ADRs completos | Contexto perdido |
| P3.3 | Risk register formal | Riscos não rastreados |

---

## 6. MATRIZ DE RISCOS

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Script sobrescreve arquivo crítico | ALTA | CRÍTICO | Quarentena + CODEOWNERS |
| Regressão passa despercebida | ALTA | ALTO | CI/CD + coverage gates |
| Projeto gerado incompleto | MÉDIA | MÉDIO | Injeção genérica |
| Drift doc/código | MÉDIA | MÉDIO | Sync automático |

---

## 7. ORDEM DE EXECUÇÃO DAS FASES

1. **FASE 1**: Estabilização (corrigir lint, drift de nomes)
2. **FASE 2**: Higiene (quarentenar scripts)
3. **FASE 3**: Governança (CODEOWNERS, templates, CI/CD básico)
4. **FASE 4**: Governança Técnica (injeção genérica, validação categorias)
5. **FASE 5**: Validadores (fortalecer ContractValidator)
6. **FASE 6**: Testes (expandir cobertura, multi-prompt)
7. **FASE 7**: Quality Gates (thresholds, coverage)
8. **FASE 8**: UI/UX (design system, motion)
9. **FASE 9**: Documentação (sync com realidade)
10. **FASE 10**: Relatório Final

---

## 8. CRITÉRIOS DE ACEITE POR FASE

### FASE 1
- [ ] `pnpm lint` passa sem erros/warnings
- [ ] `pnpm typecheck` passa
- [ ] `pnpm dev` e `pnpm start` funcionam
- [ ] Todos os nomes de pacotes consistentes

### FASE 2
- [ ] Scripts perigosos em `scripts/quarantine/`
- [ ] Scripts ativos documentados em `scripts/README.md`
- [ ] Zero scripts com `cat >` em áreas críticas

### FASE 3
- [ ] `.github/CODEOWNERS` existe
- [ ] `.github/workflows/ci.yml` existe e funciona
- [ ] Templates de PR/Issue existem
- [ ] Checklist de revisão documentado

### FASE 4
- [ ] `BaseProjectAuditor` implementado (genérico)
- [ ] `CategoryValidator` implementado (genérico)
- [ ] Zero referências a estruturas de dados específicas
- [ ] Testes para novos componentes

### FASE 5
- [ ] ContractValidator fortalecido
- [ ] Validação programática > prompt textual
- [ ] Testes de regressão

### FASE 6
- [ ] Coverage > 50%
- [ ] Testes multi-prompt implementados
- [ ] Zero `passWithNoTests` mascarando lacunas

### FASE 7
- [ ] CI bloqueia se coverage cair
- [ ] CI bloqueia se lint falhar
- [ ] Smoke tests no CI

### FASE 8
- [ ] Design tokens documentados
- [ ] Motion tokens documentados
- [ ] Componentes consistentes

### FASE 9
- [ ] README reflete realidade
- [ ] DEVELOPMENT.md atualizado
- [ ] ADRs para decisões críticas

### FASE 10
- [ ] Relatório final completo
- [ ] Todos os riscos documentados
- [ ] Próximos passos claros

---

## 9. CONDIÇÃO PARA SAIR DA FASE 0

✅ Mapa completo produzido
✅ Inventário de módulos feito
✅ Arquivos críticos identificados
✅ Scripts inventariados
✅ Backlog executivo criado
✅ Riscos mapeados
✅ Ordem de execução definida
✅ Critérios de aceite por fase definidos

**FASE 0 CONCLUÍDA. PODE AVANÇAR PARA FASE 1.**
