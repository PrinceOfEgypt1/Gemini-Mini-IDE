# Política de Uso de IA no Gemini Mini-IDE

## Objetivo

Esta política define diretrizes para uso seguro e responsável de IA assistente no desenvolvimento do projeto.

## Princípios

1. **IA como Assistente, não Autor**: O desenvolvedor humano é responsável por todo código que entra no repositório
2. **Verificação Obrigatória**: Todo código gerado por IA deve ser revisado antes de commit
3. **Governança Preservada**: IA não deve enfraquecer mecanismos de proteção existentes

## Regras

### O que a IA PODE fazer
- Gerar código inicial para features
- Sugerir refatorações
- Identificar bugs
- Escrever testes
- Documentar código
- Analisar arquitetura

### O que a IA NÃO PODE fazer
- Remover validadores sem substituto adequado
- Desabilitar testes para "fazer passar"
- Usar `any` ou suppressions para esconder problemas
- Sobrescrever arquivos críticos em bloco
- Fazer commits sem revisão humana

## Checklist para Código Gerado por IA

Antes de fazer commit de código gerado por IA:

- [ ] Li e entendi todo o código gerado
- [ ] Verifiquei que não há placeholders (TODO, FIXME, ...)
- [ ] Verifiquei que não há `any` ou `as any`
- [ ] Verifiquei que não há stubs ou implementações vazias
- [ ] Testei a funcionalidade manualmente
- [ ] Adicionei testes automatizados
- [ ] Verifiquei que não enfraquece governança existente
- [ ] Pipeline passa (lint, typecheck, test, build)

## Red Flags

Pare e revise cuidadosamente se o código gerado por IA:

1. Remove grandes blocos de código sem explicação clara
2. Adiciona suppressions (@ts-ignore, eslint-disable)
3. Usa `any` extensivamente
4. Parece "perfeito demais" sem testes
5. Modifica arquivos críticos sem justificativa
6. Introduz dependências novas sem necessidade

## Processo de Revisão

1. **Geração**: IA gera código
2. **Revisão Local**: Desenvolvedor revisa e testa localmente
3. **Commit**: Commit com flag `[AI-assisted]` no título
4. **PR**: Pull Request com checklist de IA marcado
5. **Revisão de Pares**: Outro desenvolvedor revisa
6. **Merge**: Apenas após aprovação

## Responsabilidade

- O desenvolvedor que faz commit é responsável pelo código
- "A IA fez isso" não é desculpa válida para código problemático
- Manutenção futura é responsabilidade da equipe, não da IA

## Histórico

- 2026-03-07: Política criada após incidente de remoção de governança técnica
