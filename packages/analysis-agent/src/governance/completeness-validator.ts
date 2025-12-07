export interface CompletenessValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CompletenessValidator {
  /**
   * Valida se o código gerado parece completo e profissional.
   */
  public validate(code: string, filePath: string): CompletenessValidationResult {
    const errors: string[] = [];

    // Ignorar arquivos não-código (JSON, MD, YML, Dockerfile)
    if (filePath.endsWith(".json") || 
        filePath.endsWith(".md") || 
        filePath.endsWith(".yml") || 
        filePath.endsWith(".yaml") ||
        filePath.includes("Dockerfile")) {
        return { isValid: true, errors: [] };
    }

    // 1. Checagem de Placeholders
    if (code.includes("// TODO") || code.includes("// FIXME")) {
      errors.push("Contains TODO/FIXME markers");
    }

    if (code.includes("...rest") && code.includes("//")) {
      errors.push("Contains lazy comments like '...rest'");
    }

    // 2. Checagem de Tamanho
    if (code.trim().length < 10) { // Reduzido para 10 para aceitar configs pequenas
      errors.push("File content is suspiciously short (<10 chars)");
    }

    // 3. Checagem de Exportação (Apenas para Source Code, ignorando Testes e Configs)
    const isSourceFile = (filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js"));
    const isTestFile = filePath.includes(".test.") || filePath.includes(".spec.");
    const isConfigFile = filePath.includes("config") || filePath.includes("rc");
    const isScript = filePath.includes("scripts/");

    if (isSourceFile && !isTestFile && !isConfigFile && !isScript) {
        if (!code.includes("export") && !code.includes("module.exports")) {
            // Verifica se não é apenas um arquivo de tipos
            if (!filePath.endsWith(".d.ts")) {
                errors.push("Module does not export anything");
            }
        }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
