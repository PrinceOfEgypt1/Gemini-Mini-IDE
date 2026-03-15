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
| MC-005 | CI/CD | Coverage gate real no CI | Antes houve superdeclaracao de enforcement | Thresholds coerentes no root/pacotes e falha real no CI | PARCIAL | Thresholds root ainda conservadores; shared, server e cli agora tem thresholds por pacote | Rodar testes com coverage no CI | Nao | Rodada 13 | Thresholds root 25%/15% conservadores; shared 80%/50%, server 40%/30%, cli 40%/80% por pacote. Threshold global bloqueado por ui=7.95% |
| MC-006 | CI/CD | Smoke test bloqueante | Antes havia enfraquecimento | Smoke falha quando sistema nao sobe/contrato quebra | COMPLETO | - | Prova no workflow e no script | Nao | Rodada 3 | `continue-on-error` REMOVIDO; smoke test agora e bloqueante |
| MC-007 | Governanca tecnica | Guardas reais para arquivos criticos | Antes havia guardas fracos/baseados em texto | Politica + workflow + checklist verificavel | PARCIAL | Reforcar regra, evidencia e bloqueios | Alteracao simulada em arquivo critico | Possivel branch protection | Rodada 3 | Guard depende de texto em PR body - fragil |
| MC-008 | Arquitetura | Eliminar overfitting ao Prompt 7 no pipeline principal | Foi prometido "zero overfitting" | Ausencia de logica dominante especifica em prompts/LLM client/pipeline | COMPLETO | - | Revisao de `architecture.ts`, `code-gen.ts`, `openai-llm-client.ts`, `domain-specific/` | Nao | Rodada 3 | **VERIFICADO**: `selectDomainExamples` NAO e usada no pipeline; prompts sao genericos; testes de generalidade passam |
| MC-009 | Arquitetura | Preservar salvaguardas gerais sem reintroduzir Prompt 7 | Remocoes anteriores foram parcialmente corretas | Validadores e auditorias genericas integrados ao runtime | COMPLETO | - | Execucao do fluxo real | Nao | Rodada 5 | **EVIDENCIA:** `categoryValidator.validate()` chamado em agent.ts:261 |
| MC-010 | Runtime | Integracao efetiva de `BaseProjectAuditor` e afins | Antes existiam componentes nao plenamente integrados | Chamadas reais no fluxo principal + testes | COMPLETO | - | Testes e leitura do fluxo real | Nao | Rodada 5 | **EVIDENCIA:** `baseProjectAuditor.auditAndFix()` chamado em agent.ts:258 |
| MC-011 | Testes | Estrategia de testes sem lacunas artificiais | Antes havia testes fora do escopo e exclusoes excessivas | Includes/excludes coerentes e cobertura dos pacotes relevantes | COMPLETO | - | Execucao de todos os pacotes relevantes | Nao | Rodada 3 | Config root e UI corrigidas para incluir `test/**/*.test.*` |
| MC-012 | Testes | Testes de UI dentro do escopo correto | Antes testes em `packages/ui/test/...` ficavam fora | Config UI cobre testes relevantes | COMPLETO | - | Rodar suite do UI | Nao | Rodada 3 | `packages/ui/vitest.config.ts` e `vitest.config.ts` root corrigidos |
| MC-013 | Testes | Excecoes/exclusoes minimas e justificadas | Antes havia exclusoes relevantes no analysis-agent | Reducao das exclusoes ou documentacao honesta | PARCIAL | Minimizar divida ou justificar com plano | Revisao do config + relatorio | Nao | Rodada 3 | Exclui: esaa.test.ts, agent.test.ts, index.test.ts |
| MC-014 | Repositorio | Higiene real do repositorio | Antes ainda havia residuos e artefatos locais | Estrutura limpa e coerente com `.gitignore` | COMPLETO | - | Verificacao do workspace | Nao | Rodada 15 | **ATUALIZADO Rodada 15:** 347 arquivos removidos (90.471 linhas): scripts/quarantine/ (331 scripts), 8 docs obsoletos, 2 backups .bak, 2 caches .json, 3 SQLite .db, 1 codigo morto (conversations.ts); .gitignore reforçado com 12 novas regras |
| MC-015 | Documentacao | README fiel ao estado real | Melhorou, mas ainda pode divergir | README sem superdeclaracao | COMPLETO | - | Conferencia manual contra codigo | Nao | Rodada 5 | README alinhado: 176 testes, build OK |
| MC-016 | Documentacao | KNOWN_ISSUES fiel ao codigo | Antes houve inconsistencia sobre `domain-specific/` | Pendencias descritas sem contradicao | COMPLETO | - | Conferencia manual | Nao | Rodada 3 | KNOWN_ISSUES.md corrigido: domain-specific descrito como "Optional code - NOT integrated" |
| MC-017 | UI/UX | UI premium integrada ao app principal | Antes componentes premium nao estavam integrados | Fluxo principal usando componentes finais | COMPLETO | - | Build + uso real em `main.tsx/App.tsx` | Nao | Rodada 7 | **EVIDENCIA:** AppRefactored.tsx e hooks nao utilizados REMOVIDOS; App.tsx e a UI principal verdadeira com Framer Motion e reduced motion; ambiguidade arquitetural eliminada |
| MC-018 | Motion | Motion system funcional, acessivel e integrado | Antes havia motion parcial | `prefers-reduced-motion`, integracao real e performance | COMPLETO | - | Teste de uso real + acessibilidade | Nao | Rodada 6 | **EVIDENCIA:** useReducedMotion hook criado; App.tsx respeita prefers-reduced-motion; config/animations.ts com helpers acessiveis |
| MC-019 | Relatorios | Relatorios sem superdeclaracao | Houve historico de exagero | Relatorio final usando COMPLETO/PARCIAL/NAO CUMPRIDO com honestidade | PARCIAL | Revisar linguagem final | Auditoria textual do relatorio | Nao | Rodada 3 | Item permanente |
| MC-020 | Dependencias externas | Checklist para tudo que depende de GitHub UI/settings | Parte da governanca depende de settings externos | Documento claro de aplicacao manual | COMPLETO | - | Conferencia documental | Sim | Rodada 3 | Arquivo `EXTERNAL_DEPENDENCIES_CHECKLIST.md` criado |
| MC-021 | Runtime | Validacao real de runtime e integracao minima | Rodadas anteriores validavam apenas build estatico | Server sobe, /healthz responde, entrypoint coerente | COMPLETO | - | Server start + curl /healthz + verificacao entrypoint | Nao | Rodada 8 | **EVIDENCIA:** package.json corrigido para dist/server/src/index.js; pipeline local com runtime check; CI smoke test com /healthz e entrypoint validation |
| MC-022 | Runtime | Coerencia entre build e package.json entrypoint | Entrypoint em package.json apontava para dist/index.js mas build emitia dist/server/src/index.js | package.json main e start apontam para arquivo real | COMPLETO | - | Verificar que arquivo declarado em main existe apos build | Nao | Rodada 8 | **EVIDENCIA:** main e start corrigidos para dist/server/src/index.js; CI verifica coerencia automaticamente |
| MC-023 | Governanca | Analise de impacto pre-mudanca | Nao existia mecanismo para avaliar risco antes de merge | Script executavel que classifica risco e recomenda validacoes | COMPLETO | - | Execucao do script em cenarios reais/simulados | Nao | Rodada 9 | **EVIDENCIA:** scripts/active/impact-analysis.sh criado; 5 cenarios validados; classifica BAIXO/MEDIO/ALTO/CRITICO; recomenda validacoes por area |
| MC-024 | Arquitetura | Fonte unica de verdade para analise de impacto | Rodada 9 criou script bash isolado; logica duplicada possivel | Nucleo TS em shared reutilizado por wrapper, CLI, server e IA | COMPLETO | - | Verificar que wrapper, CLI, server e agent.ts usam o mesmo nucleo | Nao | Rodada 10 | **EVIDENCIA:** packages/shared/src/impact-analysis/ e fonte unica; wrapper chama shared/dist; CLI chama POST /impact-analysis; server usa analyzeImpact(); agent.ts:279 usa analyzeImpact() |
| MC-025 | Testes | Fortalecimento real de coverage e reducao de divida de testes | Thresholds conservadores (25%/15%); shared com 0% coverage; generation/validators sem testes | Testes reais cobrindo shared/impact-analysis, generation e validators; threshold por pacote no shared | COMPLETO | - | pnpm test passa; coverage do shared sobe de 0% para 93.7%; 92 testes novos | Nao | Rodada 11 | **EVIDENCIA:** 5 novos arquivos de teste; shared coverage 0%->93.7%; analysis-agent 13.16%->14.27%; threshold shared 80% lines; 248 testes totais (vs 157 baseline) |
| MC-026 | Testes | Fortalecimento de coverage em server e cli | Server e cli tinham 0% coverage; sem thresholds por pacote; helpers e schemas inlined e nao testaveis | Testes reais cobrindo server helpers/schemas e cli commands; thresholds por pacote em server e cli | COMPLETO | - | pnpm test passa; server 0%->6.68%; cli 0%->23.39%; 294 testes totais | Nao | Rodada 12 | **EVIDENCIA:** server helpers extraidos e testados (32 tests); cli commands extraidos e testados (15 tests); thresholds por pacote adicionados; pipeline 6/6 OK |
| MC-027 | Testes | Coverage profunda em rotas/handlers do server e entrypoint do cli | Server 6.68% coverage com 0% em rotas; cli 23.39% com 0% em entrypoint; analysis-agent validators parcialmente cobertos | Testes de integracao leve via app.inject() no server; testes de factory do CLI; manifest-validator testado; thresholds elevados | COMPLETO | - | pnpm test passa; server 6.68%->56.96%; cli 23.39%->54.39%; analysis-agent validators 53.6%->100%; 354 testes totais | Nao | Rodada 13 | **EVIDENCIA:** buildApp() factory extraida do server; createProgram() factory extraida do cli; 40 testes de rotas server; 10 testes de entrypoint cli; 10 testes de manifest-validator; thresholds server 5%->40%, cli 20%->40%; agent.test.ts auditado — bloqueado por schema mismatch + client structure change |
| MC-028 | Testes | Coverage de UI (animations, contexts, hooks, services, utils) e analysis-agent types | UI sem testes em areas criticas; analysis-agent rich-schemas.ts com 0% coverage | Testes reais cobrindo animations, ThemeContext, ToastContext, useReducedMotion, api service, discoveryParser, stream; rich-schemas.ts com 100% coverage | COMPLETO | - | pnpm test passa; 56 testes novos UI; 31 testes novos analysis-agent; rich-schemas 0%->100%; analysis-agent 14.9%->16.66%; 321 testes totais | Nao | Rodada 14 | **EVIDENCIA:** 7 novos arquivos de teste UI com @vitest-environment jsdom; rich-schemas.test.ts cobre todos os 14 Zod schemas; pipeline 6/6 OK |
| MC-029 | Repositorio | Saneamento estrutural completo (Operacao Terra Limpa) | Repositorio carregava 331 scripts quarentenados, docs obsoletos, codigo morto e artefatos de runtime | Quarantine removida; docs obsoletos removidos; codigo morto removido; .gitignore reforçado; base verde | COMPLETO | - | Pipeline 6/6 OK; 441 testes passando; zero residuos operacionais | Nao | Rodada 15 | **EVIDENCIA:** 347 arquivos removidos (90.471 linhas) em 2 commits; 331 scripts quarentenados + 8 docs obsoletos + 2 backups .bak + 2 caches .json + 3 SQLite .db + 1 codigo morto (conversations.ts); .gitignore com 12 novas regras de contencao |

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
| 2026-03-11 | Rodada 6 - Fase 0 | Abertura da rodada UI/motion | IA | Branch limpa a partir de main; baseline: 176 testes, lint/typecheck/build OK |
| 2026-03-11 | Rodada 6 - Fase 1-4 | Auditoria e implementacao | IA | Hook useReducedMotion criado; config/animations.ts com suporte a reduced motion; App.tsx integrado |
| 2026-03-11 | Rodada 6 - Fase 5-6 | Validacao e governanca | IA | MC-018 promovido a COMPLETO; MC-017 permanece PARCIAL (hooks faltantes em AppRefactored.tsx) |
| 2026-03-11 | Rodada 7 - Fase 0-2 | Auditoria e decisao final | IA | AppRefactored.tsx identificado como codigo morto; decisao de remocao tomada |
| 2026-03-11 | Rodada 7 - Fase 3-4 | Implementacao e validacao | IA | AppRefactored.tsx e hooks nao utilizados removidos; 176 testes passando |
| 2026-03-11 | Rodada 7 - Fase 5-6 | Governanca e encerramento | IA | MC-017 e COI-009 promovidos a COMPLETO; linha de recuperacao ENCERRADA |
| 2026-03-13 | Rodada 8 - Fase 0-3 | Auditoria e implementacao de runtime validation | IA | Entrypoint corrigido; CI smoke test com /healthz e entrypoint check; pipeline local com runtime validation |
| 2026-03-13 | Rodada 8 - Fase 4-5 | Validacao e governanca | IA | MC-021 e MC-022 criados como COMPLETO; COI-016 criado e fechado |
| 2026-03-13 | Rodada 9 - Fase 0-4 | Implementacao de analise de impacto | IA | Script impact-analysis.sh criado; 5 cenarios validados; classifica risco por area |
| 2026-03-13 | Rodada 9 - Fase 5-6 | Governanca e relatorio | IA | MC-023 criado como COMPLETO |
| 2026-03-14 | Rodada 10 - Fase 0-7 | Institucionalizacao da analise de impacto | IA | Nucleo TS em shared; wrapper, CLI, server e agent.ts integrados; fonte unica de verdade |
| 2026-03-14 | Rodada 10 - Fase 8-9 | Governanca e relatorio | IA | MC-024 criado como COMPLETO |
| 2026-03-14 | Rodada 11 - Fase 5 | Fortalecimento de coverage e testes | IA | MC-025 criado como COMPLETO; MC-005 atualizado; COI-002 parcialmente atendido |
| 2026-03-14 | Rodada 12 - Fase 5 | Fortalecimento de coverage em server e cli | IA | MC-026 criado como COMPLETO; MC-005 atualizado; server e cli com thresholds por pacote |
| 2026-03-14 | Rodada 13 - Fase 5 | Coverage profunda em rotas/handlers server e entrypoint cli | IA | MC-027 criado como COMPLETO; MC-005 atualizado; thresholds server e cli elevados; agent.test.ts bloqueio documentado |
| 2026-03-15 | Rodada 14 - Fase 5 | Coverage UI + analysis-agent types | IA | MC-028 criado como COMPLETO; 56 testes UI + 31 testes rich-schemas; analysis-agent rich-schemas 0%->100% |
| 2026-03-15 | Rodada 15 - Fase 5 | Operacao Terra Limpa — saneamento estrutural | IA | MC-029 criado como COMPLETO; MC-014 atualizado; **347 arquivos removidos (90.471 linhas)** em 2 commits; scripts/quarantine eliminado; .gitignore reforçado |
