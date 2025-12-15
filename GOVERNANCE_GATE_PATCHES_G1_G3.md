# PR: Governance Gate Patches G1 e G3

**Branch**: `claude/fix-server-startup-018VNKPS4rf3H8w4TnyfS1mC`
**Commit**: `4aa04e2`
**Status**: ✅ Pronto para Review

---

## Objetivo

Corrigir **2 bugs** identificados na auditoria técnica (`GOVERNANCE_GATE_JSDOC_AUDIT.md`):
- **G1**: `export async function` não era detectado (faltava `async` na regex)
- **G3**: Entrypoints (`src/main.tsx`, `src/index.ts`) eram incorretamente rejeitados por não exportar

---

## PATCH G1 — Detecção de `export async function`

### Problema Original

A regex de "exported declaration" não incluía a palavra `async`:

```typescript
// ANTES (INCORRETO):
const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);
```

**Comportamento bugado**:
```typescript
export async function fetchUser(id: string) {
  // Código sem JSDoc
}
// ✅ ACEITO (BUG - deveria exigir JSDoc)
```

### Solução Implementada

**Arquivo**: `packages/analysis-agent/src/governance/completeness-validator.ts`
**Linha**: 141

```typescript
// DEPOIS (CORRETO):
const exportDecl = /^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var)\b/.test(line);
//                                             ^^^^^^^^^^^ ADICIONADO
```

**Comportamento correto**:
```typescript
export async function fetchUser(id: string) {
  // Código sem JSDoc
}
// ❌ REJEITADO - "Missing JSDoc for exported declaration near line 1"
```

### Testes Adicionados

**Teste G1a**: Rejeitar `export async function` sem JSDoc
```typescript
it("should reject export async function without JSDoc", () => {
  const code = `
    export async function fetchUser(id: string) {
      const res = await fetch(\`/api/users/\${id}\`);
      return res.json();
    }
  `;
  const result = validator.validate(code, "src/api/user.ts");
  expect(result.isValid).toBe(false); // ✅ PASSA
  expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
});
```

**Teste G1b**: Aceitar `export async function` com JSDoc
```typescript
it("should accept export async function with JSDoc", () => {
  const code = `
    /**
     * Fetches user data from API.
     * @param id - User ID
     * @returns User data
     */
    export async function fetchUser(id: string) {
      const res = await fetch(\`/api/users/\${id}\`);
      return res.json();
    }
  `;
  const result = validator.validate(code, "src/api/user.ts");
  expect(result.isValid).toBe(true); // ✅ PASSA
});
```

---

## PATCH G3 — Entrypoints Não Exigem Exports

### Problema Original

Entrypoints como `src/main.tsx` eram rejeitados com:
```
[VALIDATION_FAIL_COMPLETENESS] src/main.ts:
  - Module does not export anything
```

**Por quê é um bug?**
- Entrypoints executam código (side effects), não exportam APIs
- `src/main.tsx` (React), `src/index.ts` (Node.js) são exemplos clássicos
- Exigir exports nesses arquivos está **conceitualmente errado**

### Solução Implementada

#### 1. Helper Function `isEntrypoint`

**Arquivo**: `packages/analysis-agent/src/governance/completeness-validator.ts`
**Linhas**: 82-87

```typescript
// G3 fix: detectar entrypoints (não exportam por design)
const isEntrypoint =
  normalizedPath.endsWith("/main.ts") ||
  normalizedPath.endsWith("/main.tsx") ||
  normalizedPath.endsWith("/index.ts") ||
  normalizedPath.endsWith("/index.tsx");
```

**Arquivos detectados**:
- `src/main.ts`
- `src/main.tsx`
- `src/index.ts`
- `src/index.tsx`
- `packages/foo/src/main.tsx` (qualquer path terminando nesses nomes)

#### 2. Pular Validação de Exports

**Linha**: 118

```typescript
// ANTES:
if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {

// DEPOIS:
if (isSourceFile && !isTestFile && !isConfigFile && !isScript && !isEntrypoint) {
//                                                                 ^^^^^^^^^^^^^^^ ADICIONADO
```

#### 3. Pular Validação de JSDoc

**Linha**: 136

```typescript
// ANTES:
if ((normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) &&
    !isTestFile && !isConfigFile && !isScript) {

// DEPOIS:
if ((normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) &&
    !isTestFile && !isConfigFile && !isScript && !isEntrypoint) {
//                                                ^^^^^^^^^^^^^^^ ADICIONADO
```

**Justificativa**: Entrypoints não exportam, logo não há "exported declarations" para documentar com JSDoc.

### Validações Que Ainda Aplicam em Entrypoints

✅ **Placeholders** (TODO, FIXME, ...) → **BLOQUEADOS**
✅ **`any` types** → **BLOQUEADOS**
✅ **Suppressions** (@ts-ignore, @ts-nocheck) → **BLOQUEADOS**
✅ **Conteúdo mínimo** (< 20 chars) → **BLOQUEADO**

❌ **Exports obrigatórios** → **RELAXADO**
❌ **JSDoc em exports** → **RELAXADO** (não há exports)

### Testes Adicionados

**Teste G3a**: Aceitar `src/main.tsx` sem exports
```typescript
it("should accept src/main.tsx without exports", () => {
  const code = `
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import App from './App.tsx';

    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  `;
  const result = validator.validate(code, "src/main.tsx");
  expect(result.isValid).toBe(true); // ✅ PASSA
  expect(result.errors).not.toContain("Module does not export anything");
});
```

**Teste G3b**: Rejeitar entrypoint com TODO (prova que outras validações aplicam)
```typescript
it("should reject entrypoint with TODO (other validations still apply)", () => {
  const code = `
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import App from './App.tsx';

    // TODO: add error boundary
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  `;
  const result = validator.validate(code, "src/main.tsx");
  expect(result.isValid).toBe(false); // ✅ PASSA
  expect(result.errors).toContain("Contains TODO marker");
});
```

---

## Resumo das Mudanças

### Arquivos Modificados

1. **`completeness-validator.ts`**
   - Adicionado `(async\s+)?` na regex de exported declarations (linha 141)
   - Adicionado helper `isEntrypoint` (linhas 82-87)
   - Modificado validação de exports (linha 118)
   - Modificado validação de JSDoc (linha 136)
   - **Total**: +14 linhas, -3 linhas

2. **`completeness-validator.test.ts`**
   - Adicionado 2 testes para G1 (async function)
   - Adicionado 2 testes para G3 (entrypoints)
   - **Total**: +68 linhas

### Estatísticas

```
2 files changed, 81 insertions(+), 5 deletions(-)
```

---

## Validação

### Testes Executados

```bash
pnpm --filter @gemini-mini-ide/analysis-agent test src/governance
```

**Resultado**:
```
✓ src/governance/structure-auditor.test.ts     (11 tests) 5ms
✓ src/governance/completeness-validator.test.ts (25 tests) 10ms
✓ src/governance/syntax-sandbox.test.ts         (15 tests) 115ms

Test Files  3 passed (3)
Tests  51 passed (51)
Duration  130ms
```

**Breakdown**:
- 47 testes originais ✅
- 4 testes novos (G1 e G3) ✅
- **Total**: 51 testes passando

### TypeScript Compilation

```bash
pnpm --filter @gemini-mini-ide/analysis-agent exec tsc --noEmit
```

**Resultado**: ✅ **Sem erros**

---

## Diff Completo

### `completeness-validator.ts`

```diff
@@ -79,6 +79,13 @@ export class CompletenessValidator {
       normalizedPath.includes("vite.config") ||
       normalizedPath.includes("vitest.config");

+    // G3 fix: detectar entrypoints (não exportam por design)
+    const isEntrypoint =
+      normalizedPath.endsWith("/main.ts") ||
+      normalizedPath.endsWith("/main.tsx") ||
+      normalizedPath.endsWith("/index.ts") ||
+      normalizedPath.endsWith("/index.tsx");
+
     if (isTsLike && !isScript) {
       // any / as any são aceitos como "code smell" grave aqui
       if (/\bany\b/.test(code)) {
@@ -102,13 +109,13 @@ export class CompletenessValidator {
       }
     }

-    // 4) Checagem de exportação (apenas para source code, ignorando testes e configs)
+    // 4) Checagem de exportação (apenas para source code, ignorando testes, configs e entrypoints)
     const isSourceFile =
       normalizedPath.endsWith(".ts") ||
       normalizedPath.endsWith(".tsx") ||
       normalizedPath.endsWith(".js");

-    if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {
+    if (isSourceFile && !isTestFile && !isConfigFile && !isScript && !isEntrypoint) {
       const hasExport =
         /\bexport\s+/.test(code) ||
         /\bmodule\.exports\b/.test(code) ||
@@ -119,18 +126,20 @@ export class CompletenessValidator {
       }
     }

-    // 5) Exigir JSDoc em exports públicos (somente para TS/TSX não-testes)
+    // 5) Exigir JSDoc em exports públicos (somente para TS/TSX não-testes, não-configs, não-entrypoints)
     // Regra pragmática: qualquer linha "export class|function|interface|type|const|let|var" deve ter /** ... */ imediatamente antes.
     if (
       (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) &&
       !isTestFile &&
       !isConfigFile &&
-      !isScript
+      !isScript &&
+      !isEntrypoint
     ) {
       const lines = code.split("\n");
       for (let i = 0; i < lines.length; i++) {
         const line = lines[i] ?? "";
-        const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);
+        // G1 fix: incluir (async\s+)? para detectar "export async function"
+        const exportDecl = /^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var)\b/.test(line);

         if (!exportDecl) continue;
```

### `completeness-validator.test.ts`

```diff
@@ -231,4 +231,71 @@ describe("CompletenessValidator", () => {
       expect(result.isValid).toBe(true);
     });
   });
+
+  describe("G1 Fix: async function detection", () => {
+    it("should reject export async function without JSDoc", () => {
+      const code = `
+        export async function fetchUser(id: string) {
+          const res = await fetch(\`/api/users/\${id}\`);
+          return res.json();
+        }
+      `;
+      const result = validator.validate(code, "src/api/user.ts");
+      expect(result.isValid).toBe(false);
+      expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
+    });
+
+    it("should accept export async function with JSDoc", () => {
+      const code = `
+        /**
+         * Fetches user data from API.
+         * @param id - User ID
+         * @returns User data
+         */
+        export async function fetchUser(id: string) {
+          const res = await fetch(\`/api/users/\${id}\`);
+          return res.json();
+        }
+      `;
+      const result = validator.validate(code, "src/api/user.ts");
+      expect(result.isValid).toBe(true);
+    });
+  });
+
+  describe("G3 Fix: entrypoints don't require exports", () => {
+    it("should accept src/main.tsx without exports", () => {
+      const code = `
+        import React from 'react';
+        import ReactDOM from 'react-dom/client';
+        import App from './App.tsx';
+
+        ReactDOM.createRoot(document.getElementById('root')!).render(
+          <React.StrictMode>
+            <App />
+          </React.StrictMode>
+        );
+      `;
+      const result = validator.validate(code, "src/main.tsx");
+      expect(result.isValid).toBe(true);
+      expect(result.errors).not.toContain("Module does not export anything");
+    });
+
+    it("should reject entrypoint with TODO (other validations still apply)", () => {
+      const code = `
+        import React from 'react';
+        import ReactDOM from 'react-dom/client';
+        import App from './App.tsx';
+
+        // TODO: add error boundary
+        ReactDOM.createRoot(document.getElementById('root')!).render(
+          <React.StrictMode>
+            <App />
+          </React.StrictMode>
+        );
+      `;
+      const result = validator.validate(code, "src/main.tsx");
+      expect(result.isValid).toBe(false);
+      expect(result.errors).toContain("Contains TODO marker");
+    });
+  });
 });
```

---

## Impacto

### Antes dos Patches

| Cenário | Comportamento | Correto? |
|---------|--------------|----------|
| `export async function foo()` sem JSDoc | ✅ Aceito | ❌ **BUG** |
| `src/main.tsx` sem exports | ❌ Rejeitado | ❌ **BUG** |

### Depois dos Patches

| Cenário | Comportamento | Correto? |
|---------|--------------|----------|
| `export async function foo()` sem JSDoc | ❌ Rejeitado | ✅ **CORRETO** |
| `export async function foo()` com JSDoc | ✅ Aceito | ✅ **CORRETO** |
| `src/main.tsx` sem exports | ✅ Aceito | ✅ **CORRETO** |
| `src/main.tsx` com TODO | ❌ Rejeitado | ✅ **CORRETO** |

---

## Checklist de Review

- [x] Código compila sem erros TypeScript
- [x] Todos os 51 testes passando
- [x] G1: `async` adicionado à regex de exported declarations
- [x] G3: Helper `isEntrypoint` implementado
- [x] G3: Validação de exports pula entrypoints
- [x] G3: Validação de JSDoc pula entrypoints
- [x] G3: Outras validações (placeholders, any, suppressions) ainda aplicam em entrypoints
- [x] Testes cobrem ambos os patches (4 novos testes)
- [x] Commit message descritivo e detalhado
- [x] Diffs revisados e confirmados

---

## Comandos para Validação Local

```bash
# 1. Fetch e checkout do branch
git fetch origin claude/fix-server-startup-018VNKPS4rf3H8w4TnyfS1mC
git checkout claude/fix-server-startup-018VNKPS4rf3H8w4TnyfS1mC

# 2. Ver o commit
git log --oneline -1
# 4aa04e2 fix(governance): patch G1 (async detection) and G3 (entrypoints)

# 3. Ver diffs
git show 4aa04e2 --stat
git show 4aa04e2

# 4. Rodar testes
pnpm --filter @gemini-mini-ide/analysis-agent test src/governance

# 5. Verificar compilação
pnpm --filter @gemini-mini-ide/analysis-agent exec tsc --noEmit
```

---

## Próximos Passos

1. ✅ **Code Review** deste PR
2. ⏸️ Considerar implementar **G2** (enum detection) em PR futuro
3. ⏸️ Considerar implementar **G4** (relaxar conteúdo mínimo em configs) em PR futuro

**Status atual**: ✅ **Pronto para merge**

**Bugs corrigidos**: 2/4 (G1 e G3 - os mais críticos)
**Bugs pendentes**: 2/4 (G2 e G4 - severidade baixa/média)
