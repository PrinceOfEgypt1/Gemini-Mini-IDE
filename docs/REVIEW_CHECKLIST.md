# Checklist de Revisão de Código

## Revisão Geral

### Qualidade de Código
- [ ] Código segue convenções do projeto
- [ ] Nomes de variáveis/funções são descritivos
- [ ] Funções são pequenas e fazem uma coisa
- [ ] Sem duplicação de código
- [ ] Sem código comentado desnecessário
- [ ] Sem console.log de debug

### TypeScript
- [ ] Sem uso de `any`
- [ ] Sem `as any` ou type assertions desnecessárias
- [ ] Sem `@ts-ignore` ou `@ts-nocheck`
- [ ] Tipos exportados documentados
- [ ] Interfaces bem definidas

### Segurança
- [ ] Sem credenciais hardcoded
- [ ] Sem dados sensíveis em logs
- [ ] Input validado antes de uso
- [ ] Sem vulnerabilidades óbvias

### Testes
- [ ] Testes para nova funcionalidade
- [ ] Testes para bug fix
- [ ] Testes passam localmente
- [ ] Cobertura adequada

---

## Revisão de Arquivos Críticos

### Se modifica `/governance/`
- [ ] Não enfraquece validações existentes
- [ ] Mantém ou melhora proteção contra lazy code
- [ ] Testes específicos para mudança
- [ ] ADR documentado se for mudança arquitetural

### Se modifica `/validators/`
- [ ] Validações são genéricas (não específicas para um domínio)
- [ ] Não remove proteções sem substituto
- [ ] Testes de regressão

### Se modifica `agent.ts`
- [ ] Fluxo principal preservado
- [ ] Error handling adequado
- [ ] Logging apropriado
- [ ] Performance considerada

### Se modifica `/prompts/`
- [ ] Prompts são genéricos
- [ ] Sem referências a casos específicos (Prompt 7)
- [ ] Instruções claras e não ambíguas
- [ ] Testado com diferentes tipos de projeto

---

## Revisão para Uso de IA

### Se código foi gerado por IA
- [ ] Todo código foi revisado manualmente
- [ ] Sem placeholders (TODO, FIXME, ...)
- [ ] Sem stubs vazios
- [ ] Funcionalidade testada
- [ ] Integração com código existente verificada
- [ ] Não introduz overfitting a um caso específico

---

## Revisão de Grandes Mudanças

### Se PR tem >200 linhas deletadas
- [ ] Justificativa documentada
- [ ] Funcionalidade não foi perdida
- [ ] Testes ainda cobrem casos importantes
- [ ] Rollback plan considerado

### Se PR modifica >10 arquivos
- [ ] Mudança é coesa (faz uma coisa)
- [ ] Não mistura refatoração com feature
- [ ] Pode ser dividida em PRs menores?

---

## Aprovação Final

- [ ] Pipeline CI passa
- [ ] Pelo menos 1 aprovação de reviewer
- [ ] Se arquivos críticos: aprovação de core maintainer
- [ ] Conflitos resolvidos
- [ ] Branch atualizada com base
