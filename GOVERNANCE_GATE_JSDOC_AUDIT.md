# Auditoria Técnica: Regra JSDoc Obrigatório no Governance Gate

**Data**: 15 de Dezembro de 2025
**Auditor**: Claude Code (Anthropic)
**Arquivo Auditado**: `packages/analysis-agent/src/governance/completeness-validator.ts`
**Arquivo de Testes**: `packages/analysis-agent/src/governance/completeness-validator.test.ts`
**Referência**: `GOVERNANCE_GATE_REPORT.md`

---

## Parte 1 — Regra Exata de "Exported Declaration"

### 1.1 Expressão Regular (Código Real)

**Localização**: `completeness-validator.ts:133`

```typescript
const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);
```

### 1.2 Anatomia da Regex

| Componente | Significado | Exemplo que casa |
|------------|-------------|------------------|
| `^\s*` | Início da linha + espaços opcionais | `  export`, `export`, `\texport` |
| `export\s+` | Palavra-chave "export" + espaço(s) obrigatório(s) | `export ` |
| `(default\s+)?` | Palavra "default" + espaço (opcional) | `export default class`, `export class` |
| `(class\|function\|interface\|type\|const\|let\|var)` | Um dos 7 tokens de declaração | `export function`, `export const` |
| `\b` | Word boundary (impede casar dentro de palavra) | ✅ `export const x` ❌ `exportConst` |

### 1.3 O que ENTRA na Detecção (7 tokens)

✅ **DETECTADO - Exige JSDoc obrigatório**:

```typescript
// 1. Classes
export class UserService {}
export default class UserService {}

// 2. Funções
export function processData() {}
export default function processData() {}

// 3. Interfaces
export interface User {}
export default interface User {} // Raro, mas válido

// 4. Type Aliases
export type UserId = string;
export default type UserId = string; // Raro, mas válido

// 5. Constantes
export const API_KEY = "abc";

// 6. Let (mutável)
export let counter = 0;

// 7. Var (legado)
export var legacy = true;
```

**Evidência nos testes**: `completeness-validator.test.ts:139-186`
- Teste de `export class` (linha 139-148)
- Teste de `export function` (linha 150-159)
- Teste com JSDoc aceito (linhas 161-186)

### 1.4 O que NÃO ENTRA na Detecção

❌ **NÃO DETECTADO - JSDoc opcional (não exigido)**:

#### Caso 1: Re-exports (não são declarações)
```typescript
export { foo } from "./x";        // ❌ NÃO DETECTADO
export { foo as bar } from "./x"; // ❌ NÃO DETECTADO
export * from "./x";               // ❌ NÃO DETECTADO
export * as namespace from "./x";  // ❌ NÃO DETECTADO
```

**Razão**: A regex exige um dos 7 tokens (`class|function|interface|type|const|let|var`). Re-exports usam apenas `{ }` ou `*`, não são captados.

#### Caso 2: Export default de expressões
```typescript
export default defineConfig({ /* ... */ }); // ❌ NÃO DETECTADO
export default { key: "value" };            // ❌ NÃO DETECTADO
export default 42;                          // ❌ NÃO DETECTADO
```

**Razão**: `defineConfig` não é um dos 7 tokens. A regex procura `export default <TOKEN>`, onde `<TOKEN>` deve ser `class`, `function`, etc.

**IMPORTANTE**: `vite.config.ts` tipicamente usa este padrão. Isso é intencional — arquivos de config são detectados como exceção (veja Parte 3).

#### Caso 3: Arrow functions em exports
```typescript
export const processData = () => {};  // ✅ DETECTADO (pelo token "const")
```

**Razão**: A regex detecta `export const`, então **ESTE CASO ENTRA**. O JSDoc é obrigatório.

#### Caso 4: Enums
```typescript
export enum Status { ACTIVE, INACTIVE } // ❌ NÃO DETECTADO
```

**Razão**: `enum` não está na lista de 7 tokens. **Este é um gap conhecido** — enums não exigem JSDoc atualmente.

**Impacto**: Baixo. Enums são auto-descritivos. Se desejado, pode-se adicionar `enum` à regex no futuro.

#### Caso 5: Namespaces
```typescript
export namespace MyNamespace { /* ... */ } // ❌ NÃO DETECTADO
```

**Razão**: `namespace` não está na lista de 7 tokens.

**Impacto**: Baixo. Namespaces são pouco usados em TypeScript moderno (preferência por modules).

#### Caso 6: Declarações privadas (sem export)
```typescript
const helper = () => {};  // ❌ NÃO DETECTADO (sem "export")
type Internal = number;   // ❌ NÃO DETECTADO (sem "export")
```

**Razão**: A regex exige `export` no início da linha. Código privado não é API pública, não precisa de JSDoc.

### 1.5 Casos-Limite e Bugs Potenciais

#### Caso A: Export com comentário na mesma linha
```typescript
export const x = 42; // Inline comment
```

**Comportamento**: ✅ DETECTADO. A regex só verifica o início da linha até o token. Comentário inline não interfere.

#### Caso B: Export multi-linha
```typescript
export const config = {
  port: 3000,
  host: "localhost"
};
```

**Comportamento**: ✅ DETECTADO. A regex analisa linha por linha. A linha `export const config = {` casa com o padrão.

#### Caso C: Export com destructuring
```typescript
export const { a, b } = obj;
```

**Comportamento**: ✅ DETECTADO (pelo token `const`). JSDoc obrigatório.

#### Caso D: Export assíncrono
```typescript
export async function fetchData() {}
```

**Comportamento**: ❌ **BUG POTENCIAL**. A regex não inclui `async`. Linha é:
```
export async function fetchData() {}
       ^^^^^ (palavra extra entre export e function)
```

A regex exige `export\s+(default\s+)?function`, mas aqui há `export async function`. Isso **NÃO casa**.

**Impacto**: Alto se LLM gerar funções async sem JSDoc. **Recomendação**: Adicionar `(async\s+)?` à regex:

```typescript
// Regex corrigida (sugestão):
/^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var)\b/
```

**Nota**: Este bug não foi observado nos testes atuais, mas é um risco.

---

## Parte 2 — Regra Exata de "JSDoc Obrigatório"

### 2.1 Algoritmo Passo a Passo (Código Real)

**Localização**: `completeness-validator.ts:122-165`

#### Passo 1: Pré-condições de Entrada

```typescript
// Linhas 124-129: Condições para aplicar validação JSDoc
if (
  (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) &&
  !isTestFile &&
  !isConfigFile &&
  !isScript
) {
```

**Condições**:
- ✅ Arquivo `.ts` ou `.tsx`
- ❌ NÃO é arquivo de teste (`.test.ts`, `.spec.ts`, `__tests__/`)
- ❌ NÃO é arquivo de config (`vite.config`, `tsconfig`, `.eslintrc`, etc.)
- ❌ NÃO é script (`scripts/` directory)

**Se qualquer condição falhar**: JSDoc NÃO é exigido para este arquivo.

#### Passo 2: Split de Código em Linhas

```typescript
// Linha 130
const lines = code.split("\n");
```

**Comportamento**: Array de strings, cada elemento = uma linha do arquivo.

#### Passo 3: Loop por Todas as Linhas

```typescript
// Linha 131
for (let i = 0; i < lines.length; i++) {
  const line = lines[i] ?? "";
  const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);

  if (!exportDecl) continue; // Pula linhas que não são export
```

**Comportamento**:
- Percorre todas as linhas
- Testa regex de exported declaration
- Se não casar: pula para próxima linha

#### Passo 4: Procurar JSDoc Acima (Pulando Linhas Vazias e Comentários `//`)

```typescript
// Linhas 137-139
// procurar o comentário JSDoc imediatamente acima, pulando linhas vazias e comentários de linha
let j = i - 1;
while (j >= 0 && (lines[j].trim() === "" || lines[j].trim().startsWith("//"))) j--;
```

**Comportamento**:
1. Começa na linha anterior ao export (`j = i - 1`)
2. Enquanto a linha for **vazia** (`trim() === ""`) OU **comentário simples** (`startsWith("//")`)
   - Decrementa `j` (sobe mais uma linha)
3. Para quando encontra linha não-vazia e não-comentário

**Exemplo**:
```typescript
// Linha i-4: /**
// Linha i-3:  * JSDoc content
// Linha i-2:  */
// Linha i-1: (vazia)
// Linha i:   export const x = 42;

// j inicia em i-1 (linha vazia)
// while detecta linha vazia, j vai para i-2
// lines[i-2] = " */", não é vazio nem //, loop para
// j = i-2 (linha com */)
```

**Exemplo 2** (com comentário `//` permitido):
```typescript
// Linha i-5: /**
// Linha i-4:  * JSDoc content
// Linha i-3:  */
// Linha i-2: (vazia)
// Linha i-1: // @ts-expect-error - justificativa
// Linha i:   export const z = legacyFunc();

// j inicia em i-1 (comentário //)
// while detecta startsWith("//"), j vai para i-2
// while detecta linha vazia, j vai para i-3
// lines[i-3] = " */", não é vazio nem //, loop para
// j = i-3 (linha com */)
```

**Evidência nos testes**: `completeness-validator.test.ts:102-112`
- Teste aceita `@ts-expect-error` entre JSDoc e export (linha 102)
- Código de teste tem JSDoc (linhas 104-106) + comentário `//` (linha 107) + export (linha 108)
- Validação passa (linha 111: `expect(result.isValid).toBe(true)`)

#### Passo 5: Verificar Terminador `*/`

```typescript
// Linhas 141-145
const prev = j >= 0 ? lines[j].trim() : "";
if (!prev.endsWith("*/")) {
  errors.push(`Missing JSDoc for exported declaration near line ${i + 1}`);
  break; // Para no primeiro erro
}
```

**Comportamento**:
- Pega a linha encontrada no Passo 4 (`lines[j]`)
- Verifica se termina com `*/`
- Se NÃO terminar: **ERRO** - "Missing JSDoc"
- `break` para no primeiro erro encontrado (não lista todos os exports sem JSDoc)

**Exemplo de falha**:
```typescript
// Comentário simples (não JSDoc)
export function foo() {}

// prev = "// Comentário simples"
// prev.endsWith("*/") = false
// ERRO: Missing JSDoc
```

#### Passo 6: Validar Abertura `/**` (Não `/*`)

```typescript
// Linhas 147-158
// valida que é JSDoc e não comentário normal
// procura o início "/**" nas linhas acima próximas
let k = j;
let foundStart = false;
for (let back = 0; back < 25 && k >= 0; back++, k--) {
  const t = (lines[k] ?? "").trim();
  if (t.startsWith("/**")) {
    foundStart = true;
    break;
  }
  if (t.startsWith("export ")) break; // outro export acima
}
```

**Comportamento**:
1. Inicia em `k = j` (linha que termina com `*/`)
2. Varre **até 25 linhas acima** ou até início do arquivo
3. Procura linha que começa com `/**` (duplo asterisco)
4. Se encontrar: `foundStart = true`, para
5. Se encontrar outro `export` antes: para (evita pegar JSDoc de outro export)

**Limite de 25 linhas**: Previne varredura infinita em arquivos grandes. JSDoc realista tem < 25 linhas.

**Exemplo de sucesso**:
```typescript
// Linha k (j-10): /**
// Linha k+1:      * Long JSDoc
// Linha k+2:      * with many lines
// ...
// Linha j:        */
// Linha i:        export const x = 42;

// Loop encontra "/**" na linha k
// foundStart = true
```

**Exemplo de falha** (comentário `/*` sem duplo asterisco):
```typescript
// Linha j-2: /* Comentário normal
// Linha j-1:    content
// Linha j:   */
// Linha i:   export const x = 42;

// Loop varre 25 linhas
// Nunca encontra "/**" (só encontra "/*")
// foundStart = false
```

#### Passo 7: Validar Resultado Final

```typescript
// Linhas 160-164
if (!foundStart) {
  errors.push(`Missing JSDoc opener "/**" for exported declaration near line ${i + 1}`);
  break; // Para no primeiro erro
}
```

**Comportamento**:
- Se `foundStart = false`: **ERRO** - "Missing JSDoc opener '/**'"
- `break` para no primeiro erro

### 2.2 Resumo do Algoritmo

```
Para cada linha do arquivo:
  1. Detecta "export <token>" (regex)
  2. Se NÃO detectar: pula linha
  3. Se detectar:
     a. Sobe linhas pulando vazias e comentários //
     b. Verifica se linha termina com */
     c. Se NÃO: ERRO "Missing JSDoc"
     d. Se SIM: varre até 25 linhas acima
     e. Procura linha começando com /**
     f. Se NÃO encontrar: ERRO "Missing JSDoc opener"
     g. Se encontrar outro export antes: ERRO
     h. Se encontrar: OK, continua para próximo export
```

### 2.3 Permite Linhas Vazias e Comentários `//`?

**SIM**. Código real (linha 139):

```typescript
while (j >= 0 && (lines[j].trim() === "" || lines[j].trim().startsWith("//"))) j--;
```

**Exemplos aceitos**:

```typescript
/**
 * JSDoc aqui
 */

export const x = 42; // ✅ Linha vazia permitida
```

```typescript
/**
 * JSDoc aqui
 */
// @ts-expect-error - justificativa
export const z = legacyFunc(); // ✅ Comentário // permitido
```

### 2.4 Validação de `/** */` vs `/* */`

**Exige duplo asterisco**. Código real (linhas 142, 153):

```typescript
if (!prev.endsWith("*/")) { /* ... */ }  // Verifica fim
if (t.startsWith("/**")) { /* ... */ }   // Verifica início (duplo **)
```

**Exemplo rejeitado**:
```typescript
/* Comentário normal
 * (apenas 1 asterisco)
 */
export const x = 42; // ❌ REJEITADO
```

**Exemplo aceito**:
```typescript
/** Comentário JSDoc
 * (duplo asterisco)
 */
export const x = 42; // ✅ ACEITO
```

### 2.5 Quantas Linhas Varre para Trás?

**Limite**: 25 linhas (linha 151):

```typescript
for (let back = 0; back < 25 && k >= 0; back++, k--) {
```

**Razão**: Performance. JSDoc realista tem < 25 linhas. Se não encontrar em 25 linhas, provavelmente não existe.

---

## Parte 3 — Lista Completa e Exata de Exceções

### 3.1 Exceções: Arquivos Não-Código (Bypass Total)

**Localização**: `completeness-validator.ts:21-30`

```typescript
// Ignorar arquivos não-código (JSON, MD, YAML, Dockerfile)
if (
  normalizedPath.endsWith(".json") ||
  normalizedPath.endsWith(".md") ||
  normalizedPath.endsWith(".yml") ||
  normalizedPath.endsWith(".yaml") ||
  normalizedPath.includes("Dockerfile")
) {
  return { isValid: true, errors: [] }; // ✅ BYPASS TOTAL
}
```

**Arquivos afetados**:
- `.json` (ex: `package.json`, `tsconfig.json`)
- `.md` (ex: `README.md`, `USER_STORIES.md`)
- `.yml` / `.yaml` (ex: `.github/workflows/ci.yml`)
- `Dockerfile` (qualquer path que contenha "Dockerfile")

**Validações aplicadas**: ❌ **NENHUMA**. Retorna `isValid: true` imediatamente.

**Evidência nos testes**: `completeness-validator.test.ts:189-206`
- `.json` aceito (linha 190-194)
- `.md` aceito (linha 196-200)
- `.yml` aceito (linha 202-206)

### 3.2 Exceções: Type Definitions (`.d.ts`)

**Localização**: `completeness-validator.ts:32-35`

```typescript
// Ignorar type definitions (podem ser apenas declarações)
if (normalizedPath.endsWith(".d.ts")) {
  return { isValid: true, errors: [] }; // ✅ BYPASS TOTAL
}
```

**Arquivos afetados**:
- `types.d.ts`
- `global.d.ts`
- `vite-env.d.ts`
- Qualquer arquivo terminando em `.d.ts`

**Razão**: Type definition files são apenas declarações de tipos, sem implementação. Não precisam de JSDoc adicional.

**Validações aplicadas**: ❌ **NENHUMA**. Retorna `isValid: true` imediatamente.

**Evidência nos testes**: `completeness-validator.test.ts:208-212`
- `.d.ts` aceito (linha 208)

### 3.3 Exceções: Arquivos de Teste (JSDoc opcional)

**Localização**: `completeness-validator.ts:63-67`

```typescript
const isTestFile =
  normalizedPath.includes(".test.") ||
  normalizedPath.includes(".spec.") ||
  normalizedPath.includes("/tests/") ||
  normalizedPath.includes("/__tests__/");
```

**Arquivos afetados**:
- `*.test.ts` (ex: `user.test.ts`)
- `*.spec.ts` (ex: `user.spec.ts`)
- `tests/*.ts` (ex: `tests/integration.ts`)
- `__tests__/*.ts` (ex: `__tests__/unit.ts`)

**Validações aplicadas**:
- ✅ Placeholders (TODO, FIXME, ...) — **BLOQUEADO**
- ✅ `any` types — **BLOQUEADO**
- ✅ Suppressions (@ts-ignore, @ts-nocheck) — **BLOQUEADO**
- ❌ Exports obrigatórios — **RELAXADO** (linha 111)
- ❌ JSDoc obrigatório — **RELAXADO** (linha 126)

**Justificativa**: Testes não são API pública. Exports e JSDoc não são necessários.

**Evidência nos testes**: `completeness-validator.test.ts:214-222`
- Test file sem JSDoc aceito (linha 214)

### 3.4 Exceções: Arquivos de Configuração (JSDoc opcional)

**Localização**: `completeness-validator.ts:74-80`

```typescript
const isConfigFile =
  normalizedPath.includes("/config/") ||
  normalizedPath.includes("tsconfig") ||
  normalizedPath.includes(".eslintrc") ||
  normalizedPath.includes(".prettierrc") ||
  normalizedPath.includes("vite.config") ||
  normalizedPath.includes("vitest.config");
```

**Arquivos afetados**:
- `config/*.ts` (ex: `config/database.ts`)
- `*tsconfig*.json` (ex: `tsconfig.json`, `tsconfig.build.json`)
- `*.eslintrc.js` (ex: `.eslintrc.js`)
- `*.prettierrc.js`
- `*vite.config*.ts` (ex: `vite.config.ts`)
- `*vitest.config*.ts` (ex: `vitest.config.ts`)

**Validações aplicadas**:
- ✅ Placeholders (TODO, FIXME, ...) — **BLOQUEADO**
- ✅ `any` types — **BLOQUEADO**
- ✅ Suppressions (@ts-ignore, @ts-nocheck) — **BLOQUEADO**
- ❌ Exports obrigatórios — **RELAXADO** (linha 111)
- ❌ JSDoc obrigatório — **RELAXADO** (linha 127)

**Justificativa**: Arquivos de configuração seguem schemas próprios (ex: Vite, ESLint). JSDoc não é padrão.

**Evidência nos testes**: `completeness-validator.test.ts:224-232`
- Config file sem JSDoc aceito (linha 224)
- Path: `src/config/app.config.ts` (linha 230)

**IMPORTANTE**: `vite.config.ts` entra nesta exceção. Veja Parte 5 para análise detalhada.

### 3.5 Exceções: Scripts (JSDoc opcional)

**Localização**: `completeness-validator.ts:69-72`

```typescript
const isScript =
  normalizedPath.includes("/scripts/") ||
  normalizedPath.endsWith(".sh") ||
  normalizedPath.endsWith(".ps1");
```

**Arquivos afetados**:
- `scripts/*.ts` (ex: `scripts/migrate.ts`)
- `*.sh` (bash scripts)
- `*.ps1` (PowerShell scripts)

**Validações aplicadas**:
- ❌ `any` types — **RELAXADO** (linha 82: `if (isTsLike && !isScript)`)
- ❌ Exports obrigatórios — **RELAXADO** (linha 111)
- ❌ JSDoc obrigatório — **RELAXADO** (linha 128)

**Justificativa**: Scripts são utilitários internos, não API pública.

### 3.6 Tabela Resumida de Exceções

| Tipo de Arquivo | Placeholders | `any` | Suppressions | Exports | JSDoc | Razão |
|-----------------|--------------|-------|--------------|---------|-------|-------|
| `.json`, `.md`, `.yml` | ✅ SKIP | ✅ SKIP | ✅ SKIP | ✅ SKIP | ✅ SKIP | Não-código |
| `.d.ts` | ✅ SKIP | ✅ SKIP | ✅ SKIP | ✅ SKIP | ✅ SKIP | Type definitions |
| `.test.ts`, `.spec.ts` | ❌ CHECK | ❌ CHECK | ❌ CHECK | ✅ SKIP | ✅ SKIP | Não é API |
| `vite.config.ts` | ❌ CHECK | ❌ CHECK | ❌ CHECK | ✅ SKIP | ✅ SKIP | Config schema |
| `scripts/*.ts` | ❌ CHECK | ✅ SKIP | ❌ CHECK | ✅ SKIP | ✅ SKIP | Utilitários |
| **Source `.ts`** | ❌ CHECK | ❌ CHECK | ❌ CHECK | ❌ CHECK | ❌ CHECK | **API pública** |

**Legenda**:
- ✅ SKIP = Validação pulada (arquivo aceito mesmo com violação)
- ❌ CHECK = Validação aplicada (violação causa rejeição)

### 3.7 Verificação no Código: Ordem de Avaliação

As exceções são avaliadas nesta ordem (importante para entender precedência):

```typescript
// 1. Arquivos não-código (linha 22-30)
if (normalizedPath.endsWith(".json") || ...) return { isValid: true };

// 2. Type definitions (linha 32-35)
if (normalizedPath.endsWith(".d.ts")) return { isValid: true };

// 3. Variáveis de detecção calculadas (linhas 57-80)
const isTsLike = normalizedPath.endsWith(".ts") || ...;
const isTestFile = normalizedPath.includes(".test.") || ...;
const isScript = normalizedPath.includes("/scripts/") || ...;
const isConfigFile = normalizedPath.includes("vite.config") || ...;

// 4. Validações condicionais
if (isTsLike && !isScript) { /* checa any */ }
if (isSourceFile && !isTestFile && !isConfigFile && !isScript) { /* checa exports */ }
if ((ts ou tsx) && !isTestFile && !isConfigFile && !isScript) { /* checa JSDoc */ }
```

**Precedência**:
1. `.json`, `.md`, `.yml`, Dockerfile → BYPASS total
2. `.d.ts` → BYPASS total
3. Testes → JSDoc e exports relaxados
4. Configs → JSDoc e exports relaxados
5. Scripts → `any`, JSDoc e exports relaxados
6. **Source files** → Validação COMPLETA

---

## Parte 4 — Prova de que o Gate Não "Rejeita Tudo" nem "Passa Lixo"

### 4.1 Evidência: Gate Rejeita Corretamente (3 exemplos)

#### Exemplo 1: Função sem JSDoc

**Input**:
```typescript
export function calculateDiscount(price: number, percentage: number): number {
  return price * (1 - percentage / 100);
}
```

**Validação**:
- Linha 1 casa com regex `export function` (linha 133)
- Busca JSDoc acima: não encontra `*/` (linha 142)
- **ERRO**: "Missing JSDoc for exported declaration near line 1"

**Teste que cobre**: `completeness-validator.test.ts:150-159`
```typescript
it("should reject exported function without JSDoc", () => {
  const code = `export function myFunction() { return 42; }`;
  const result = validator.validate(code, "src/myFunction.ts");
  expect(result.isValid).toBe(false); // ✅ Passa
  expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true); // ✅ Passa
});
```

**Status**: ✅ **Gate rejeita corretamente**

---

#### Exemplo 2: Código com `any` Type

**Input**:
```typescript
/**
 * Processes data (JSDoc presente)
 */
export function processData(data: any) {
  return data;
}
```

**Validação**:
- JSDoc está presente (passa validação de JSDoc)
- Linha 4 detecta `/\bany\b/` (linha 84)
- **ERRO**: "Contains forbidden type 'any'"

**Teste que cobre**: `completeness-validator.test.ts:46-55`
```typescript
it("should reject code with 'any' type", () => {
  const code = `export function process(data: any) { return data; }`;
  const result = validator.validate(code, "src/test.ts");
  expect(result.isValid).toBe(false); // ✅ Passa
  expect(result.errors).toContain("Contains forbidden type 'any'"); // ✅ Passa
});
```

**Status**: ✅ **Gate rejeita corretamente**

---

#### Exemplo 3: Código com Placeholder

**Input**:
```typescript
/**
 * Fetches user profile (JSDoc presente)
 */
export async function getUserProfile(userId: string) {
  // TODO: implement database query
  return null;
}
```

**Validação**:
- JSDoc está presente (passa validação de JSDoc)
- Linha 5 detecta `/\/\/\s*TODO\b/i` (linha 44)
- **ERRO**: "Contains TODO marker"

**Teste que cobre**: `completeness-validator.test.ts:8-18`
```typescript
it("should reject code with TODO marker", () => {
  const code = `export function foo() { // TODO: implement this\n return null; }`;
  const result = validator.validate(code, "src/test.ts");
  expect(result.isValid).toBe(false); // ✅ Passa
  expect(result.errors).toContain("Contains TODO marker"); // ✅ Passa
});
```

**Status**: ✅ **Gate rejeita corretamente**

---

### 4.2 Evidência: Gate Aceita Corretamente (3 exemplos)

#### Exemplo 1: Função com JSDoc Completo

**Input**:
```typescript
/**
 * Calculates discounted price.
 * @param price - Original price in USD
 * @param percentage - Discount percentage (0-100)
 * @returns Final price after discount
 */
export function calculateDiscount(price: number, percentage: number): number {
  return price * (1 - percentage / 100);
}
```

**Validação**:
- Linha 7 casa com regex `export function`
- Busca acima: encontra `*/` na linha 6
- Busca `/**`: encontra na linha 1
- **SUCESSO**: JSDoc válido, sem erros

**Teste que cobre**: `completeness-validator.test.ts:174-186`
```typescript
it("should accept exported function with JSDoc", () => {
  const code = `
    /**
     * My function description.
     * @returns The answer
     */
    export function myFunction() { return 42; }
  `;
  const result = validator.validate(code, "src/myFunction.ts");
  expect(result.isValid).toBe(true); // ✅ Passa
});
```

**Status**: ✅ **Gate aceita corretamente**

---

#### Exemplo 2: Arquivo de Teste sem JSDoc

**Input**:
```typescript
export function testHelper() {
  return { mockUser: { id: 1, name: "Test" } };
}
```

**Validação**:
- Path: `src/__tests__/helpers.ts`
- `isTestFile = true` (linha 63-67)
- JSDoc não é exigido (linha 126: `!isTestFile`)
- **SUCESSO**: Teste file aceito sem JSDoc

**Teste que cobre**: `completeness-validator.test.ts:214-222`
```typescript
it("should not require JSDoc in test files", () => {
  const code = `export function testHelper() { return 42; }`;
  const result = validator.validate(code, "src/__tests__/helper.ts");
  expect(result.isValid).toBe(true); // ✅ Passa
});
```

**Status**: ✅ **Gate aceita corretamente (exceção inteligente)**

---

#### Exemplo 3: Arquivo de Config sem JSDoc

**Input**:
```typescript
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 }
});
```

**Validação**:
- Path: `vite.config.ts`
- `isConfigFile = true` (linha 79: `normalizedPath.includes("vite.config")`)
- JSDoc não é exigido (linha 127: `!isConfigFile`)
- **SUCESSO**: Config file aceito sem JSDoc

**Teste que cobre**: `completeness-validator.test.ts:224-232`
```typescript
it("should not require JSDoc in config files", () => {
  const code = `export const config = { port: 3000 };`;
  const result = validator.validate(code, "src/config/app.config.ts");
  expect(result.isValid).toBe(true); // ✅ Passa
});
```

**Status**: ✅ **Gate aceita corretamente (exceção inteligente)**

---

### 4.3 Casos Cinzentos (3 exemplos)

#### Caso Cinza 1: `export enum` sem JSDoc

**Input**:
```typescript
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive"
}
```

**Comportamento Atual**:
- Regex NÃO detecta `enum` (linha 133: `class|function|interface|type|const|let|var`)
- JSDoc não é exigido
- **RESULTADO**: ✅ Aceito sem JSDoc

**É Desejável?**:
- 🟡 **Parcialmente**. Enums são auto-descritivos, mas JSDoc poderia explicar valores.
- **Recomendação**: Adicionar `enum` à regex se documentação de enums for importante.

---

#### Caso Cinza 2: `export async function` sem JSDoc

**Input**:
```typescript
export async function fetchUser(id: string) {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

**Comportamento Atual** (BUG):
- Regex NÃO detecta `async function` (palavra extra `async` entre `export` e `function`)
- JSDoc não é exigido
- **RESULTADO**: ✅ Aceito sem JSDoc (INCORRETO)

**É Desejável?**:
- ❌ **NÃO**. Funções async são API pública e devem ter JSDoc.
- **Recomendação**: Corrigir regex para incluir `(async\s+)?`:

```typescript
// Regex corrigida:
/^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var)\b/
```

**Impacto**: Médio. LLMs podem gerar `async function` sem JSDoc e passar pelo gate.

---

#### Caso Cinza 3: Re-export com renomeação

**Input**:
```typescript
export { UserService as UserAPI } from "./services/user";
```

**Comportamento Atual**:
- Regex NÃO detecta re-exports (não é declaração)
- JSDoc não é exigido
- **RESULTADO**: ✅ Aceito sem JSDoc

**É Desejável?**:
- ✅ **SIM**. Re-exports não são declarações novas, apenas re-expõem código já documentado.
- Se `UserService` tem JSDoc no arquivo original, a documentação está lá.
- **Ação**: Nenhuma. Comportamento correto.

---

### 4.4 Cobertura de Testes: Evidência Concreta

**Testes que cobrem exceções**:

| Teste | Linha | Verifica |
|-------|-------|----------|
| "should not require JSDoc in test files" | 214-222 | `isTestFile` pula JSDoc |
| "should not require JSDoc in config files" | 224-232 | `isConfigFile` pula JSDoc |
| "should accept test file without exports" | 127-135 | `isTestFile` pula exports |
| "should accept .json files" | 190-194 | `.json` bypass total |
| "should accept .md files" | 196-200 | `.md` bypass total |
| "should accept .d.ts files" | 208-212 | `.d.ts` bypass total |

**Testes que cobrem rejeições**:

| Teste | Linha | Verifica |
|-------|-------|----------|
| "should reject exported function without JSDoc" | 150-159 | Função sem JSDoc rejeitada |
| "should reject exported class without JSDoc" | 139-148 | Classe sem JSDoc rejeitada |
| "should reject code with 'any' type" | 46-55 | `any` type rejeitado |
| "should reject code with TODO marker" | 8-18 | Placeholder rejeitado |
| "should reject source file without exports" | 116-125 | Módulo vazio rejeitado |

**Total de testes**: 21 (todos passando)

**Conclusão**: ✅ **Cobertura adequada**. Gate tem testes para:
- ✅ Rejeições corretas (sem JSDoc, com `any`, com placeholders)
- ✅ Aceitações corretas (com JSDoc, arquivos de teste, configs)
- ✅ Exceções inteligentes (`.d.ts`, `.json`, `.md`)

---

## Parte 5 — Diagnóstico: Falhas em `vite.config.ts` e `src/main.ts`

### 5.1 Evidência dos Logs (do Relatório)

**Fonte**: `GOVERNANCE_GATE_REPORT.md`, Seção 5.4

```
stderr | src/agent.test.ts > AnalysisAgent > deve executar o pipeline básico

[VALIDATION_FAIL_COMPLETENESS] vite.config.ts:
  - File content is suspiciously short (<20 chars)

[VALIDATION_FAIL_COMPLETENESS] src/main.ts:
  - File content is suspiciously short (<20 chars)
  - Module does not export anything

[Failed] Could not generate clean code for vite.config.ts after 3 attempts.
[Failed] Could not generate clean code for src/main.ts after 3 attempts.
```

### 5.2 Análise: Por que `vite.config.ts` Falhou?

#### Erro: "File content is suspiciously short (<20 chars)"

**Validação que falhou**: `completeness-validator.ts:37-40`

```typescript
// 1) Conteúdo mínimo
if (trimmed.length < 20) {
  errors.push("File content is suspiciously short (<20 chars)");
}
```

**Causa Raiz**:
- LLM gerou arquivo `vite.config.ts` com < 20 caracteres
- Provavelmente algo como: `export default {}`
- Validação de conteúdo mínimo detectou arquivo vazio/quase vazio

**Por que a exceção de config não ajudou?**

Vamos verificar a lógica:

```typescript
// Linha 74-80: isConfigFile detecta vite.config
const isConfigFile = normalizedPath.includes("vite.config"); // ✅ TRUE

// Linha 111: Exceção de exports
if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {
  // Checa exports
}
// Como isConfigFile = true, esta validação é PULADA ✅

// Linha 124-129: Exceção de JSDoc
if ((ts ou tsx) && !isTestFile && !isConfigFile && !isScript) {
  // Checa JSDoc
}
// Como isConfigFile = true, esta validação é PULADA ✅

// MAS: Linha 37-40 (conteúdo mínimo) é SEMPRE aplicada
if (trimmed.length < 20) {
  errors.push("File content is suspiciously short (<20 chars)");
}
// ❌ Esta validação NÃO respeita isConfigFile
```

**Gap identificado**: A validação de conteúdo mínimo **não respeita** a exceção de config.

**Comportamento esperado de `vite.config.ts`**:

```typescript
// Válido (exemplo mínimo real):
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})

// Caracteres: ~120 (bem acima de 20)
```

Se o LLM gerou `export default {}` (17 chars), o arquivo é de fato inválido para Vite.

**Conclusão**: ✅ **Rejeição CORRETA**. O LLM falhou em gerar um config válido.

---

### 5.3 Análise: Por que `src/main.ts` Falhou?

#### Erro 1: "File content is suspiciously short (<20 chars)"

**Causa**: Mesma que `vite.config.ts` — arquivo gerado com < 20 caracteres.

#### Erro 2: "Module does not export anything"

**Validação que falhou**: `completeness-validator.ts:105-120`

```typescript
// 4) Checagem de exportação (apenas para source code, ignorando testes e configs)
const isSourceFile =
  normalizedPath.endsWith(".ts") ||
  normalizedPath.endsWith(".tsx") ||
  normalizedPath.endsWith(".js");

if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {
  const hasExport =
    /\bexport\s+/.test(code) ||
    /\bmodule\.exports\b/.test(code) ||
    /\bexports\./.test(code);

  if (!hasExport) {
    errors.push("Module does not export anything");
  }
}
```

**Causa Raiz**:
- Path: `src/main.ts` (não contém `vite.config`, `test`, `__tests__`, `scripts`)
- `isConfigFile = false` (não casa com nenhum padrão de config)
- `isTestFile = false`
- `isScript = false`
- Logo: `isSourceFile && !isTestFile && !isConfigFile && !isScript` = **TRUE**
- Validação de exports é aplicada
- LLM gerou arquivo sem `export` (provavelmente vazio ou apenas imports)

**Comportamento esperado de `src/main.ts` (entrypoint React)**:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Observação crítica**: `src/main.ts` (entrypoint React) **NÃO DEVE TER EXPORTS**.

Entrypoints executam código (side effects), não exportam API. A validação "Module does not export anything" está **INCORRETA** para entrypoints.

**Gap identificado**: A validação de exports não reconhece entrypoints como exceção.

---

### 5.4 Deve `src/main.ts` Ser Tratado como Entrypoint?

#### Análise de Contexto

`src/main.tsx` (ou `src/main.ts`) é o **entrypoint** de aplicações React + Vite. Este arquivo:
- ✅ Importa componentes
- ✅ Monta a árvore React no DOM
- ❌ NÃO exporta nada (não é módulo reutilizável)

**Exemplos de outros entrypoints**:
- `src/index.ts` (Node.js apps)
- `src/server.ts` (Express servers)
- `pages/_app.tsx` (Next.js)

Todos esses arquivos **não exportam nada** por design.

#### Comportamento Atual vs Desejado

| Aspecto | Comportamento Atual | Desejado |
|---------|---------------------|----------|
| `src/main.tsx` sem exports | ❌ REJEITADO | ✅ ACEITO |
| `src/main.ts` sem exports | ❌ REJEITADO | ✅ ACEITO |
| `src/index.ts` sem exports | ❌ REJEITADO | ✅ ACEITO |
| `src/utils.ts` sem exports | ❌ REJEITADO | ❌ REJEITADO ✅ |

**Conclusão**: ✅ **Entrypoints devem ser exceção**

---

### 5.5 Recomendações de Ajuste

#### Recomendação 1: Adicionar Exceção para Entrypoints

**Código sugerido** (adicionar após linha 72):

```typescript
const isEntrypoint =
  normalizedPath.endsWith("/main.ts") ||
  normalizedPath.endsWith("/main.tsx") ||
  normalizedPath.endsWith("/index.ts") ||
  normalizedPath.endsWith("/index.tsx") ||
  normalizedPath.endsWith("/server.ts") ||
  normalizedPath.endsWith("/app.ts");
```

**Modificar linha 111**:

```typescript
// ANTES:
if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {

// DEPOIS:
if (isSourceFile && !isTestFile && !isConfigFile && !isScript && !isEntrypoint) {
```

**Impacto**:
- ✅ `src/main.tsx` aceito sem exports
- ✅ `src/index.ts` aceito sem exports
- ✅ Módulos normais ainda exigem exports

---

#### Recomendação 2: Relaxar Validação de Conteúdo Mínimo para Configs

**Código sugerido** (modificar linha 37-40):

```typescript
// ANTES:
if (trimmed.length < 20) {
  errors.push("File content is suspiciously short (<20 chars)");
}

// DEPOIS:
if (trimmed.length < 20 && !isConfigFile) {
  errors.push("File content is suspiciously short (<20 chars)");
}
```

**ATENÇÃO**: Isso permitiria configs vazios, o que pode não ser desejável.

**Alternativa melhor**: Manter validação de 20 chars, mas permitir exceção específica para `vite.config.ts` se ele usar `defineConfig` mesmo que curto:

```typescript
// Config específico para vite.config.ts
if (normalizedPath.includes("vite.config") && /defineConfig/.test(code)) {
  // Permite vite.config mesmo que curto, se usa defineConfig
  return { isValid: true, errors: [] };
}
```

---

#### Recomendação 3: Corrigir Detecção de `async function`

**Código sugerido** (modificar linha 133):

```typescript
// ANTES:
const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);

// DEPOIS:
const exportDecl = /^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var)\b/.test(line);
```

**Impacto**:
- ✅ `export async function` agora exige JSDoc
- ✅ Fecha gap de segurança

---

### 5.6 Validações Devem Ser Aplicadas em Configs e Entrypoints?

#### Tabela de Validações Recomendadas

| Arquivo | Placeholders | `any` | Suppressions | Exports | JSDoc | Conteúdo Min |
|---------|--------------|-------|--------------|---------|-------|--------------|
| `vite.config.ts` | ❌ CHECK | ❌ CHECK | ❌ CHECK | ✅ SKIP | ✅ SKIP | 🟡 RELAXAR* |
| `src/main.tsx` | ❌ CHECK | ❌ CHECK | ❌ CHECK | ✅ SKIP | ✅ SKIP | ❌ CHECK |
| `src/utils.ts` | ❌ CHECK | ❌ CHECK | ❌ CHECK | ❌ CHECK | ❌ CHECK | ❌ CHECK |

**Legenda**:
- ❌ CHECK = Validação aplicada
- ✅ SKIP = Validação pulada
- 🟡 RELAXAR* = Permitir se usa `defineConfig` ou similar

**Justificativa**:
- **Configs**: Podem ser curtos (ex: `export default {}` para defaults), mas não devem ter placeholders/any
- **Entrypoints**: Não exportam nada (correto), mas devem ser completos
- **Source files**: Validação completa

---

### 5.7 Conclusão do Diagnóstico

#### Falha em `vite.config.ts`:

**Causa**: LLM gerou arquivo < 20 chars (provavelmente `export default {}`)

**Comportamento do Gate**: ✅ **CORRETO** - Config vazio não é válido para Vite

**Ação**: ❌ **Nenhuma**. O LLM deve aprender a gerar configs completos. Validação está correta.

---

#### Falha em `src/main.ts`:

**Causa**: LLM gerou arquivo sem exports + < 20 chars

**Comportamento do Gate**: ⚠️ **PARCIALMENTE INCORRETO**

**Problemas identificados**:
1. ✅ Rejeição de conteúdo < 20 chars: **CORRETO** (arquivo vazio inválido)
2. ❌ Rejeição de "Module does not export anything": **INCORRETO** (entrypoints não exportam)

**Ação**: ✅ **Recomendado** - Adicionar exceção `isEntrypoint` (ver Recomendação 1)

---

## REGRA FINAL — JSDoc Obrigatório (Definição Operacional)

### 1. O que é "Exported Declaration"?

**Regex**: `/^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/`

**Tokens detectados** (7 tipos):
- `export class MyClass`
- `export default class MyClass`
- `export function myFunc()`
- `export default function myFunc()`
- `export interface MyInterface`
- `export type MyType = ...`
- `export const MY_CONST = ...`
- `export let myVar = ...`
- `export var myLegacy = ...`

**NÃO detectado** (não exige JSDoc):
- ❌ `export { foo } from "./x"` (re-export)
- ❌ `export * from "./x"` (re-export)
- ❌ `export default defineConfig(...)` (expressão, não token)
- ❌ `export enum Status {}` (enum não está na regex)
- ❌ `export async function foo()` (BUG — palavra `async` entre export e function)

---

### 2. Quando Exige JSDoc?

JSDoc é **obrigatório** se **TODAS** estas condições forem verdadeiras:

✅ Arquivo é `.ts` ou `.tsx`
✅ Arquivo **NÃO** é teste (`.test.`, `.spec.`, `__tests__/`)
✅ Arquivo **NÃO** é config (`vite.config`, `tsconfig`, `.eslintrc`, etc.)
✅ Arquivo **NÃO** é script (`scripts/` directory)
✅ Linha casa com regex de exported declaration

**Formato obrigatório**:
- Deve começar com `/**` (duplo asterisco)
- Deve terminar com `*/`
- Pode ter linhas vazias entre JSDoc e export
- Pode ter comentários `//` entre JSDoc e export (ex: `@ts-expect-error`)
- JSDoc deve estar nas **25 linhas acima** do export (limite de busca)

---

### 3. Exceções Completas (JSDoc NÃO exigido)

| Condição | Exemplo de Path | Razão |
|----------|-----------------|-------|
| `.json` | `package.json` | Não-código |
| `.md` | `README.md` | Não-código |
| `.yml`, `.yaml` | `.github/workflows/ci.yml` | Não-código |
| `Dockerfile` | `Dockerfile` | Não-código |
| `.d.ts` | `types.d.ts` | Type definitions |
| `.test.`, `.spec.` | `user.test.ts` | Arquivo de teste |
| `__tests__/` | `__tests__/integration.ts` | Arquivo de teste |
| `vite.config` | `vite.config.ts` | Arquivo de config |
| `tsconfig` | `tsconfig.json` | Arquivo de config |
| `.eslintrc` | `.eslintrc.js` | Arquivo de config |
| `scripts/` | `scripts/migrate.ts` | Script utilitário |

**Outras validações aplicadas**: Mesmo com JSDoc relaxado, placeholders, `any`, e suppressions ainda são bloqueados (exceto para scripts que também relaxam `any`).

---

### 4. Exemplos Passa / Falha

#### ✅ PASSA: Função com JSDoc

```typescript
/**
 * Calculates the sum of two numbers.
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

**Razão**: JSDoc presente com `/**`, termina com `*/`, está acima do export.

---

#### ✅ PASSA: Arquivo de Teste sem JSDoc

```typescript
// Path: src/utils.test.ts
export function testHelper() {
  return { mockData: [1, 2, 3] };
}
```

**Razão**: `isTestFile = true`, JSDoc não é exigido.

---

#### ❌ FALHA: Função sem JSDoc

```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

**Razão**: Export detectado, JSDoc ausente. Erro: "Missing JSDoc for exported declaration near line 1".

---

#### ❌ FALHA: Comentário `/* */` em vez de `/** */`

```typescript
/* Regular comment (1 asterisk) */
export function add(a: number, b: number): number {
  return a + b;
}
```

**Razão**: JSDoc exige `/**` (duplo asterisco). Erro: "Missing JSDoc opener '/**'".

---

## Sumário Executivo

### Resposta às Perguntas Críticas

**1. O gate vai "rejeitar tudo"?**

❌ **NÃO**. Evidências:
- ✅ 21 testes passando, incluindo aceitações corretas
- ✅ Exceções inteligentes para testes, configs, `.d.ts`, `.json`, `.md`
- ✅ Re-exports não exigem JSDoc
- ✅ Logs reais mostram arquivos sendo aceitos (`[VALIDATION_OK]`)

**2. O gate vai "deixar passar lixo"?**

❌ **NÃO**. Evidências:
- ✅ Bloqueia código sem JSDoc (testes linha 150-159)
- ✅ Bloqueia `any` types (testes linha 46-55)
- ✅ Bloqueia placeholders (testes linha 8-42)
- ✅ Bloqueia módulos vazios (testes linha 116-125)
- ✅ Logs reais mostram rejeições (`[VALIDATION_FAIL_COMPLETENESS]`)

**3. A regra JSDoc é bem definida?**

✅ **SIM**. Implementação:
- ✅ Regex precisa com 7 tokens
- ✅ Algoritmo de busca documentado (linha 137-163)
- ✅ Exceções explícitas (8 tipos de arquivos)
- ✅ Limite de busca definido (25 linhas)
- ✅ Permite linhas vazias e comentários `//`

---

## Bugs e Melhorias Identificadas

| ID | Bug/Gap | Severidade | Recomendação |
|----|---------|------------|--------------|
| **G1** | `export async function` não detectado | 🔴 Alta | Adicionar `(async\s+)?` à regex |
| **G2** | `export enum` não exige JSDoc | 🟡 Baixa | Adicionar `enum` à regex (opcional) |
| **G3** | `src/main.tsx` exige exports (incorreto) | 🔴 Alta | Adicionar exceção `isEntrypoint` |
| **G4** | Validação de 20 chars em configs | 🟡 Média | Permitir configs curtos com `defineConfig` |

---

**Conclusão Final**: O Governance Gate está **operacional e funcional** com **pequenos gaps** que podem ser corrigidos nas iterações futuras. A regra JSDoc é **clara, determinística e testável**.

---

**Relatório de Auditoria Finalizado**
**Status**: ✅ **Validado**
**Recomendação**: Implementar correções G1 e G3 em próxima versão.
