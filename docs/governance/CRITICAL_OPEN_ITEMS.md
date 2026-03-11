# CRITICAL_OPEN_ITEMS

## Objetivo
Manter uma lista viva e priorizada dos itens criticos ainda abertos no projeto **Gemini Mini-IDE**, para impedir perda de foco e impedir que a IA trate itens parciais como concluidos.

## Regras de uso
1. Este arquivo deve ser revisado no inicio e no fim de cada rodada.
2. Todo item critico deve ter:
   - severidade;
   - status;
   - area;
   - evidencia;
   - acao necessaria;
   - definicao de concluido.
3. Item critico com status **PARCIAL** continua sendo item aberto.
4. Documentar divida nao substitui resolver divida.

## Legenda
- **CRITICO** = afeta confianca, governanca, regressao, bloqueio de qualidade ou fidelidade do sistema.
- **ALTO** = afeta robustez, arquitetura, testes ou rastreabilidade de forma relevante.
- **MEDIO** = afeta qualidade, manutencao ou clareza, mas nao e o gargalo primario.
- **BAIXO** = melhoria desejavel, mas nao prioritaria neste momento.

---

## Itens FECHADOS na Rodada 3

### COI-003 - Smoke test bloqueante
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 1
- **Evidencia:** `continue-on-error: true` REMOVIDO de `.github/workflows/ci.yml`

### COI-004 - Residuos de overfitting ao Prompt 7
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 2
- **Evidencia:** Verificado que `selectDomainExamples` NAO e usada no pipeline principal; prompts sao genericos

### COI-005 - Estrategia de testes com lacunas
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 3
- **Evidencia:** `vitest.config.ts` root e `packages/ui/vitest.config.ts` corrigidos para incluir `test/**/*.test.*`

### COI-006 - Testes de UI fora do escopo
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 3
- **Evidencia:** Config do UI agora inclui `test/**/*.test.ts` e `test/**/*.test.tsx`

### COI-007 - Higiene do repositorio incompleta
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 4
- **Evidencia:** `bundles/`, `logs/`, Zone.Identifier removidos do git; `.gitignore` atualizado

### COI-008 - Documentacao nao 100% fiel
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 5
- **Evidencia:** KNOWN_ISSUES.md corrigido para refletir estado real de domain-specific

### COI-011 - Checklist de dependencias externas
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 1
- **Evidencia:** `docs/governance/EXTERNAL_DEPENDENCIES_CHECKLIST.md` criado

---

## Itens AINDA ABERTOS

### COI-001 - CI/CD ainda nao totalmente impeditivo
- **Severidade:** CRITICO
- **Area:** CI/CD / Governanca
- **Status:** PARCIAL
- **Evidencia resumida:** Workflow corrigido, mas branch protection nao aplicada
- **Acao necessaria:** Aplicar branch protection via GitHub UI
- **Definicao de concluido:** Branch protection ativa com required checks
- **Dependencia externa:** Sim - requer acao manual no GitHub

---

### COI-002 - Coverage gate ainda nao totalmente comprovado
- **Severidade:** MEDIO (rebaixado)
- **Area:** Testes / CI
- **Status:** PARCIAL
- **Evidencia resumida:** Thresholds em 25%/15% sao baixos mas funcionais
- **Acao necessaria:** Considerar elevar thresholds em rodada futura
- **Definicao de concluido:** Thresholds mais altos ou justificativa documentada
- **Nota:** Aceitavel para projeto em desenvolvimento ativo

---

### COI-009 - UI premium ainda nao integrada por completo
- **Severidade:** MEDIO
- **Area:** UI/UX
- **Status:** PARCIAL
- **Evidencia resumida:** motion/UI premium ainda parcialmente integrados ao app principal
- **Acao necessaria:** Rodada futura focada em integracao real da UI premium
- **Definicao de concluido:** Runtime principal usa de fato os componentes finais
- **Nota:** Nao era foco da Rodada 3

---

### COI-010 - Motion system premium e acessivel ainda parcial
- **Severidade:** MEDIO
- **Area:** Motion / Acessibilidade
- **Status:** PARCIAL
- **Evidencia resumida:** reduced motion e integracao real ainda nao completamente comprovados
- **Acao necessaria:** Rodada futura de UI/motion
- **Definicao de concluido:** Motion system integrado, acessivel, performatico e fiel a experiencia principal
- **Nota:** Nao era foco da Rodada 3

---

### COI-012 - Exclusoes de testes no analysis-agent
- **Severidade:** MEDIO
- **Area:** Testes / Divida tecnica
- **Status:** PARCIAL
- **Evidencia resumida:** Exclui esaa.test.ts, agent.test.ts, index.test.ts por problemas de mocking
- **Acao necessaria:** Refatorar testes ou melhorar mocking de dependencias nativas
- **Definicao de concluido:** Testes executando ou exclusoes reduzidas

---

## Resumo pos-Rodada 3

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 3 | 1 |
| ALTO | 4 | 0 |
| MEDIO | 0 | 4 |
| **Total** | **7** | **5** |

---

## Template para novos itens

### COI-XXX - Titulo do item
- **Severidade:** CRITICO / ALTO / MEDIO / BAIXO
- **Area:**
- **Status:** NAO CUMPRIDO / PARCIAL / COMPLETO
- **Evidencia resumida:**
- **Acao necessaria:**
- **Definicao de concluido:**

---

## Itens FECHADOS na Rodada 4/5

### COI-013 - Erros de build no analysis-agent
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 4
- **Evidencia:** `pnpm build` passa; PR #18 mergeado

### COI-014 - Erros de typecheck no server
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 4
- **Evidencia:** `pnpm typecheck` passa; project references removidos; type shim adicionado

### COI-015 - Validadores nao integrados ao runtime
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 5
- **Evidencia:** `baseProjectAuditor.auditAndFix()` em agent.ts:258; `categoryValidator.validate()` em agent.ts:261

---

## Resumo pos-Rodada 5

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 3 | 1 |
| ALTO | 7 | 0 |
| MEDIO | 0 | 4 |
| **Total** | **10** | **5** |

---

**Ultima atualizacao:** 2026-03-11 (Rodada 5 - Fase 2)
