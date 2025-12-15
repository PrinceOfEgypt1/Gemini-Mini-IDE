import ts from "typescript";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class SyntaxSandbox {
  /**
   * Valida APENAS a sintaxe (gramática) do TypeScript usando transpileModule.
   *
   * Vantagens desta abordagem:
   * 1. Ignora erros de tipo (ex: "Cannot find name 'Array'") - O que resolve o bloqueio anterior.
   * 2. Detecta erros de sintaxe (ex: faltou fechar chave, erro de token).
   * 3. Não acessa disco nem requer lib.d.ts.
   * 4. Usa API pública e estável do TypeScript (sem erros de propriedade inexistente).
   */
  public validateTS(code: string, filePath?: string): ValidationResult {
    // 1. Ignorar arquivos que não são TypeScript
    if (filePath && !filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      return { isValid: true };
    }

    try {
      const result = ts.transpileModule(code, {
        reportDiagnostics: true,
        fileName: filePath || "temp.ts",
        compilerOptions: {
          noEmit: true, // Não precisamos do output JS
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          // Estas opções garantem que ele não tente resolver tipos
          skipLibCheck: true,
          types: []
        }
      });

      if (result.diagnostics && result.diagnostics.length > 0) {
        const diagnostic = result.diagnostics[0];
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

        let line = 0;
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line: l } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          line = l + 1;
        }

        return {
          isValid: false,
          error: `Syntax Error at Line ${line}: ${message}`
        };
      }

      return { isValid: true };
    } catch (err) {
      // Tratamento seguro de exceções de runtime do compilador
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { isValid: false, error: `Compiler Exception: ${errorMessage}` };
    }
  }
}
