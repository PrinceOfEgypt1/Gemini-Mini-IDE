# MASTER_COMPLIANCE_MATRIX

## Objetivo
Esta matriz e a fonte principal de controle de conformidade do projeto **Gemini Mini-IDE** em relacao aos prompts de recuperacao, governanca, arquitetura, testes, CI/CD, UI/UX, motion e higiene do repositorio.

## Regras de uso
1. Este arquivo deve ser lido **antes de qualquer nova rodada de trabalho**.
2. Este arquivo deve ser atualizado:
   - no inicio de cada nova rodada;
   - ao final de cada fase;
   - ao final da execucao do prompt.
3. Nenhum item com status **PARCIAL** pode ser tratado como **COMPLETO**.
4. Nenhum item com status **NAO CUMPRIDO** pode ser omitido do relatorio final.
5. Toda mudanca de status deve registrar:
   - evidencia concreta;
   - validacao executada;
   - data/rodada;
   - observacoes relevantes.
6. Se houver dependencia externa ao repositorio, isso deve ser marcado explicitamente.

## Legenda de status
- **COMPLETO** = implementado, integrado, validado e fielmente documentado.
- **PARCIAL** = existe implementacao ou avanco, mas ainda faltam integracao, validacao, enforcement ou fidelidade documental.
- **NAO CUMPRIDO** = prometido, exigido ou necessario, mas ainda nao entregue.
- **DEPENDENCIA EXTERNA** = depende de configuracao fora do repositorio, mas deve estar documentado com checklist de aplicacao manual.

---

## Matriz de Conformidade

| ID | Area | Exigencia / Requisito | Promessa anterior / contexto | Evidencia esperada no repositorio | Status atual | Acao corretiva necessaria | Validacao exigida | Dependencia externa | Rodada-alvo | Observacoes |
|---|---|---|---|---|---|---|---|---|---|---|
| MC-001 | Governanca | Matriz de conformidade viva e obrigatoria | Controle permanente entre rodadas | Este arquivo criado e atualizado a cada rodada | COMPLETO | - | Verificar atualizacao no inicio e fim de cada rodada | Nao | Rodada 3 | Arquivo criado e em uso |
| MC-002 | Governanca | Log de status por rodada | Rastreabilidade longitudinal | `ROUND_STATUS_LOG.md` atualizado por rodada | COMPLETO | - | Conferir historico por rodada | Nao | Rodada 3 | Arquivo criado e em uso |
| MC-003 | Governanca | Lista de itens criticos abertos | Priorizacao continua do critico | `CRITICAL_OPEN_ITEMS.md` atualizado | COMPLETO | - | Conferir fechamento/abertura por item | Nao | Rodada 3 | Arquivo criado e em uso |
| MC-004 | CI/CD | Pipeline realmente impeditivo | Antes havia alertas e bloqueios insuficientes | Workflow falhando de fato em condicoes criticas | PARCIAL | Aplicar branch protection no GitHub | Execucao real do CI + revisao do workflow | Sim - branch protection | Rodada 3 | Workflow corrigido (continue-on-error removido); FALTA branch protection |
| MC-005 | CI/CD | Coverage gate real no CI | Antes houve superdeclaracao de enforcement | Thresholds coerentes no root/pacotes e falha real no CI | PARCIAL | Thresholds estao baixos mas funcionais | Rodar testes com coverage no CI | Nao | Rodada 3 | Thresholds 25%/15% - funciona mas e conservador |
| MC-006 | CI/CD | Smoke test bloqueante | Antes havia enfraquecimento | Smoke falha quando sistema nao sobe/contrato quebra | COMPLETO | - | Prova no workflow e no script | Nao | Rodada 3 | `continue-on-error` REMOVIDO; smoke test agora e bloqueante |
| MC-007 | Governanca tecnica | Guardas reais para arquivos criticos | Antes havia guardas fracos/baseados em texto | Politica + workflow + checklist verificavel | PARCIAL | Reforcar regra, evidencia e bloqueios | Alteracao simulada em arquivo critico | Possivel branch protection | Rodada 3 | Guard depende de texto em PR body - fragil |
| MC-008 | Arquitetura | Eliminar overfitting ao Prompt 7 no pipeline principal | Foi prometido "zero overfitting" | Ausencia de logica dominante especifica em prompts/LLM client/pipeline | COMPLETO | - | Revisao de `architecture.ts`, `code-gen.ts`, `openai-llm-client.ts`, `domain-specific/` | Nao | Rodada 3 | **VERIFICADO**: `selectDomainExamples` NAO e usada no pipeline; prompts sao genericos; testes de generalidade passam |
| MC-009 | Arquitetura | Preservar salvaguardas gerais sem reintroduzir Prompt 7 | Remocoes anteriores foram parcialmente corretas | Validadores e auditorias genericas integrados ao runtime | COMPLETO | - | Execucao do fluxo real | Nao | Rodada 5 | **EVIDENCIA:** `categoryValidator.validate()` chamado em agent.ts:261 |
| MC-010 | Runtime | Integracao efetiva de `BaseProjectAuditor` e afins | Antes existiam componentes nao plenamente integrados | Chamadas reais no fluxo principal + testes | COMPLETO | - | Testes e leitura do fluxo real | Nao | Rodada 5 | **EVIDENCIA:** `baseProjectAuditor.auditAndFix()` chamado em agent.ts:258 |
| MC-011 | Testes | Estrategia de testes sem lacunas artificiais | Antes havia testes fora do escopo e exclusoes excessivas | Includes/excludes coerentes e cobertura dos pacotes relevantes | COMPLETO | - | Execucao de todos os pacotes relevantes | Nao | Rodada 3 | Config root e UI corrigidas para incluir `test/**/*.test.*` |
| MC-012 | Testes | Testes de UI dentro do escopo correto | Antes testes em `packages/ui/test/...` ficavam fora | Config UI cobre testes relevantes | COMPLETO | - | Rodar suite do UI | Nao | Rodada 3 | `packages/ui/vitest.config.ts` e `vitest.config.ts` root corrigidos |
| MC-013 | Testes | Excecoes/exclusoes minimas e justificadas | Antes havia exclusoes relevantes no analysis-agent | Reducao das exclusoes ou documentacao honesta | PARCIAL | Minimizar divida ou justificar com plano | Revisao do config + relatorio | Nao | Rodada 3 | Exclui: esaa.test.ts, agent.test.ts, index.test.ts |
| MC-014 | Repositorio | Higiene real do repositorio | Antes ainda havia residuos e artefatos locais | Estrutura limpa e coerente com `.gitignore` | COMPLETO | - | Verificacao do workspace | Nao | Rodada 3 | `bundles/`, `logs/`, Zone.Identifier removidos do git; .gitignore atualizado |
| MC-015 | Documentacao | README fiel ao estado real | Melhorou, mas ainda pode divergir | README sem superdeclaracao | COMPLETO | - | Conferencia manual contra codigo | Nao | Rodada 5 | README alinhado: 176 testes, build OK |
| MC-016 | Documentacao | KNOWN_ISSUES fiel ao codigo | Antes houve inconsistencia sobre `domain-specific/` | Pendencias descritas sem contradicao | COMPLETO | - | Conferencia manual | Nao | Rodada 3 | KNOWN_ISSUES.md corrigido: domain-specific descrito como "Optional code - NOT integrated" |
| MC-017 | UI/UX | UI premium integrada ao app principal | Antes componentes premium nao estavam integrados | Fluxo principal usando componentes finais | PARCIAL | Rodada futura focada em UI | Build + uso real em `main.tsx/App.tsx` | Nao | Rodada 4 | Nao e foco primario da Rodada 3 |
| MC-018 | Motion | Motion system funcional, acessivel e integrado | Antes havia motion parcial | `prefers-reduced-motion`, integracao real e performance | PARCIAL | Rodada futura focada em UI/motion | Teste de uso real + acessibilidade | Nao | Rodada 4 | Nao considerar concluido ainda |
| MC-019 | Relatorios | Relatorios sem superdeclaracao | Houve historico de exagero | Relatorio final usando COMPLETO/PARCIAL/NAO CUMPRIDO com honestidade | PARCIAL | Revisar linguagem final | Auditoria textual do relatorio | Nao | Rodada 3 | Item permanente |
| MC-020 | Dependencias externas | Checklist para tudo que depende de GitHub UI/settings | Parte da governanca depende de settings externos | Documento claro de aplicacao manual | COMPLETO | - | Conferencia documental | Sim | Rodada 3 | Arquivo `EXTERNAL_DEPENDENCIES_CHECKLIST.md` criado |

---

## Historico de alteracoes da matriz

| Data | Rodada | Alteracao | Responsavel | Observacoes |
|---|---|---|---|---|
| 2026-03-08 | Rodada 3 - Fase 0 | Criacao do arquivo com mapeamento real do repositorio | IA | Preenchimento inicial baseado em auditoria do codigo |
| 2026-03-08 | Rodada 3 - Fase 1 | MC-001,002,003,006,020 COMPLETO; MC-004,005 atualizados | IA | Smoke test agora bloqueante; checklist externo criado |
| 2026-03-08 | Rodada 3 - Fase 2 | MC-008 COMPLETO | IA | Verificado: pipeline nao tem overfitting ativo; domain-specific e codigo opcional nao-integrado |
| 2026-03-08 | Rodada 3 - Fase 3 | MC-011,012 COMPLETO | IA | Configs de testes corrigidas para incluir `test/**/*.test.*` |
| 2026-03-08 | Rodada 3 - Fase 4 | MC-014 COMPLETO | IA | Higiene: bundles/, logs/, Zone.Identifier removidos do git |
| 2026-03-08 | Rodada 3 - Fase 5 | MC-016 COMPLETO | IA | KNOWN_ISSUES.md corrigido para refletir estado real de domain-specific |
| 2026-03-08 | Rodada 3 - Fase 6 | Fechamento da rodada | IA | 10 de 20 itens COMPLETO (50%); 10 PARCIAL; pendencias documentadas |
| 2026-03-09 | Rodada 4 | Estabilizacao tecnica | IA | Correcao de lint/typecheck/build no analysis-agent e server; PR #18 mergeado |
| 2026-03-11 | Rodada 5 - Fase 0 | Abertura da rodada de consolidacao | IA | Branch limpa a partir de main; baseline: 176 testes, lint/typecheck/build OK |
| 2026-03-11 | Rodada 5 - Fase 1 | Auditoria do estado real | IA | Divergencias identificadas: README, KNOWN_ISSUES, REMEDIATION_REPORT desatualizados |
| 2026-03-11 | Rodada 5 - Fase 2 | Consolidacao da governanca | IA | MC-009, MC-010, MC-015 reclassificados para COMPLETO com evidencia |
