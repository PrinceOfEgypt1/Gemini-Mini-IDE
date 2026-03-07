# ADR 001: Remoção do Overfitting ao Prompt 7

## Status
Aceito (Parcialmente Corrigido)

## Contexto

O Gemini Mini-IDE foi originalmente desenvolvido com foco no "Prompt 7" - visualização de estruturas de dados. Isso resultou em código excessivamente especializado:

- `ProjectTypeDetector`: 533 linhas detectando tipos específicos de projeto (VISUALIZATION, EDUCATIONAL)
- `StructureAuditor`: 665 linhas injetando arquivos específicos para estruturas de dados
- `ManifestValidator`: 459 linhas validando contagens de métodos por estrutura de dados

## Decisão

### O que foi removido corretamente
- Detecção de tipos de projeto (VISUALIZATION, EDUCATIONAL, etc.)
- Contagens hardcoded de métodos por estrutura de dados (10, 11, 12...)
- Listas de padrões regex para estruturas de dados específicas
- Injeção de arquivos específicos para visualização (animation, frames, etc.)

### O que foi removido incorretamente (perda colateral)
- Injeção de arquivos básicos (README.md, package.json, tsconfig.json)
- Validação de categorias obrigatórias (DOMAIN, APPLICATION, CONFIG, TESTS, DOCS)

### O que foi preservado
- `ContractValidator`: Valida que código entrega o que prometeu no purpose
- `CompletenessValidator`: Bloqueia placeholders, TODO, any, etc.
- `IntegrityValidator`: Valida que todos os arquivos do manifest foram gerados
- `SyntaxSandbox`: Valida sintaxe TypeScript

## Consequências

### Positivas
- Sistema mais genérico, capaz de atender qualquer tipo de prompt
- Remoção de regras arbitrárias que limitavam a criatividade do LLM
- Código mais simples e manutenível

### Negativas
- Perda de injeção automática de arquivos básicos
- Perda de validação de distribuição arquitetural
- Dependência maior do prompt textual para garantir completude

## Plano de Correção

1. Reimplementar injeção de arquivos básicos de forma genérica (sem especialização)
2. Reimplementar validação de categorias de forma genérica
3. Manter ContractValidator como mecanismo principal de validação de contrato

## Referências

- Commit eba4299: Remoção original
- Commit 01e384a: Primeira redução
- AUDIT_PHASE0_MAP.md: Documentação da análise forense

## Data
2026-03-07

## Autores
Claude (AI Assistant)
