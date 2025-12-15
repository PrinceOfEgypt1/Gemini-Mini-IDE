export interface CompletenessValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CompletenessValidator {
  /**
   * Valida se o código gerado parece completo e profissional.
   *
   * Este validador é intencionalmente "anti-lazy":
   * - Bloqueia placeholders (TODO/FIXME/...)
   * - Bloqueia `any` e `as any`
   * - Exige export (para arquivos fonte) e exige JSDoc para exports públicos
   */
  public validate(code: string, filePath: string): CompletenessValidationResult {
    const errors: string[] = [];

    const normalizedPath = filePath.replace(/\\/g, "/");
    const trimmed = (code ?? "").trim();

    // Ignorar arquivos não-código (JSON, MD, YAML, Dockerfile)
    if (
      normalizedPath.endsWith(".json") ||
      normalizedPath.endsWith(".md") ||
      normalizedPath.endsWith(".yml") ||
      normalizedPath.endsWith(".yaml") ||
      normalizedPath.includes("Dockerfile")
    ) {
      return { isValid: true, errors: [] };
    }

    // Ignorar type definitions (podem ser apenas declarações)
    if (normalizedPath.endsWith(".d.ts")) {
      return { isValid: true, errors: [] };
    }

    // 1) Conteúdo mínimo
    if (trimmed.length < 20) {
      errors.push("File content is suspiciously short (<20 chars)");
    }

    // 2) Placeholders / lazy markers
    const forbiddenMarkers: Array<{ pattern: RegExp; message: string }> = [
      { pattern: /\/\/\s*TODO\b/i, message: "Contains TODO marker" },
      { pattern: /\/\/\s*FIXME\b/i, message: "Contains FIXME marker" },
      { pattern: /\.\.\./, message: "Contains '...' placeholder" },
      { pattern: /\bTBD\b/i, message: "Contains TBD placeholder" },
      { pattern: /\bWIP\b/i, message: "Contains WIP marker" },
      { pattern: /\/\*\s*\.\.\.\s*\*\//, message: "Contains block placeholder" }
    ];

    for (const item of forbiddenMarkers) {
      if (item.pattern.test(code)) errors.push(item.message);
    }

    // 3) Banimentos de tipagem / suppressions (para arquivos TS/TSX/JS/JSX)
    const isTsLike =
      normalizedPath.endsWith(".ts") ||
      normalizedPath.endsWith(".tsx") ||
      normalizedPath.endsWith(".js") ||
      normalizedPath.endsWith(".jsx");

    const isTestFile =
      normalizedPath.includes(".test.") ||
      normalizedPath.includes(".spec.") ||
      normalizedPath.includes("/tests/") ||
      normalizedPath.includes("/__tests__/");

    const isScript =
      normalizedPath.includes("/scripts/") ||
      normalizedPath.endsWith(".sh") ||
      normalizedPath.endsWith(".ps1");

    const isConfigFile =
      normalizedPath.includes("/config/") ||
      normalizedPath.includes("tsconfig") ||
      normalizedPath.includes(".eslintrc") ||
      normalizedPath.includes(".prettierrc") ||
      normalizedPath.includes("vite.config") ||
      normalizedPath.includes("vitest.config");

    if (isTsLike && !isScript) {
      // any / as any são aceitos como "code smell" grave aqui
      if (/\bany\b/.test(code)) {
        errors.push("Contains forbidden type 'any'");
      }
      if (/\bas\s+any\b/.test(code)) {
        errors.push("Contains forbidden cast 'as any'");
      }

      // suppressions (mantém seu requisito de evitar suppressions)
      if (/@ts-ignore\b/.test(code)) errors.push("Contains @ts-ignore (forbidden)");
      if (/@ts-nocheck\b/.test(code)) errors.push("Contains @ts-nocheck (forbidden)");

      // Suppression @ts-expect-error é permitida apenas com justificativa na mesma linha
      const expectErrorLines = code.split("\n").filter(l => /@ts-expect-error\b/.test(l));
      for (const line of expectErrorLines) {
        if (!/(@ts-expect-error\b).+\S+/.test(line)) {
          errors.push("@ts-expect-error must include a justification on the same line");
          break;
        }
      }
    }

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

    // 5) Exigir JSDoc em exports públicos (somente para TS/TSX não-testes)
    // Regra pragmática: qualquer linha "export class|function|interface|type|const|let|var" deve ter /** ... */ imediatamente antes.
    if (
      (normalizedPath.endsWith(".ts") || normalizedPath.endsWith(".tsx")) &&
      !isTestFile &&
      !isConfigFile &&
      !isScript
    ) {
      const lines = code.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        const exportDecl = /^\s*export\s+(default\s+)?(class|function|interface|type|const|let|var)\b/.test(line);

        if (!exportDecl) continue;

        // procurar o comentário JSDoc imediatamente acima, pulando linhas vazias
        let j = i - 1;
        while (j >= 0 && lines[j].trim() === "") j--;

        const prev = j >= 0 ? lines[j].trim() : "";
        if (!prev.endsWith("*/")) {
          errors.push(`Missing JSDoc for exported declaration near line ${i + 1}`);
          break;
        }

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

        if (!foundStart) {
          errors.push(`Missing JSDoc opener "/**" for exported declaration near line ${i + 1}`);
          break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
