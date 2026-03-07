#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Aplicando Correção de Emergência na Lógica de Governança..."

# 1. CORRIGIR SYNTAX-SANDBOX (Ambiente + Filtro de Extensão)
# ==============================================================================
echo "[INFO] Atualizando packages/analysis-agent/src/governance/syntax-sandbox.ts..."
cat > packages/analysis-agent/src/governance/syntax-sandbox.ts << 'EOF'
import ts from "typescript";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class SyntaxSandbox {
  /**
   * Definição mínima de tipos globais para evitar erros de "Cannot find global type"
   */
  private readonly libDts = `
    declare var console: { log(msg: any): void; error(msg: any): void; warn(msg: any): void; };
    interface Array<T> { length: number; [n: number]: T; map<U>(cb: (x: T) => U): U[]; push(...items: T[]): number; }
    interface String { length: number; toString(): string; }
    interface Boolean {}
    interface Number {}
    interface Object {}
    interface Function {}
    interface IArguments {}
    interface RegExp {}
    type Promise<T> = {};
    declare var JSON: { parse(s: string): any; stringify(v: any): string; };
  `;

  /**
   * Valida se o código fornecido é TypeScript sintaticamente válido.
   * Aplica-se APENAS a arquivos .ts e .tsx.
   */
  public validateTS(code: string, filePath?: string): ValidationResult {
    // 1. Ignorar arquivos que não são TypeScript
    if (filePath && !filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      return { isValid: true };
    }

    try {
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        code,
        ts.ScriptTarget.Latest,
        true
      );

      // Cria um CompilerHost customizado que serve a lib.d.ts virtual
      const compilerHost = {
        ...ts.createCompilerHost({}),
        getSourceFile: (fileName: string) => {
          if (fileName === "temp.ts") return sourceFile;
          if (fileName === "lib.d.ts") {
            return ts.createSourceFile("lib.d.ts", this.libDts, ts.ScriptTarget.Latest, true);
          }
          return undefined;
        },
        writeFile: () => {},
        getDefaultLibFileName: () => "lib.d.ts",
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (fileName: string) => fileName,
        getCurrentDirectory: () => "",
        getNewLine: () => "\n",
        fileExists: (fileName: string) => fileName === "temp.ts" || fileName === "lib.d.ts",
        readFile: (fileName: string) => fileName === "lib.d.ts" ? this.libDts : "",
      };

      const program = ts.createProgram({
        rootNames: ["temp.ts"],
        options: {
          noEmit: true,
          target: ts.ScriptTarget.Latest,
          skipLibCheck: true, // Ignora checagem profunda de libs
          noLib: false,       // Usa nossa lib.d.ts
          module: ts.ModuleKind.CommonJS
        },
        host: compilerHost
      });

      const diagnostics = ts.getPreEmitDiagnostics(program);

      if (diagnostics.length > 0) {
        // Filtra erros irrelevantes que ainda possam passar (ex: Cannot find name 'require')
        const relevantDiagnostics = diagnostics.filter(d => {
            const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
            return !msg.includes("Cannot find name 'require'") && 
                   !msg.includes("Cannot find name 'process'") &&
                   !msg.includes("Cannot find name 'module'");
        });

        if (relevantDiagnostics.length > 0) {
            const message = ts.flattenDiagnosticMessageText(relevantDiagnostics[0].messageText, "\n");
            const line = relevantDiagnostics[0].file 
            ? relevantDiagnostics[0].file.getLineAndCharacterOfPosition(relevantDiagnostics[0].start!).line + 1 
            : 0;
            return { isValid: false, error: `Line ${line}: ${message}` };
        }
      }

      return { isValid: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { isValid: false, error: errorMessage };
    }
  }
}
EOF

# 2. CORRIGIR COMPLETENESS-VALIDATOR (Exceções para Testes)
# ==============================================================================
echo "[INFO] Atualizando packages/analysis-agent/src/governance/completeness-validator.ts..."
cat > packages/analysis-agent/src/governance/completeness-validator.ts << 'EOF'
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
EOF

# 3. ATUALIZAR AGENT.TS (Passar filePath para o Sandbox)
# ==============================================================================
echo "[INFO] Atualizando chamada do Sandbox no Agent..."
# Substitui a chamada antiga validateTS(content) pela nova validateTS(content, filePath)
sed -i 's/this.syntaxSandbox.validateTS(content);/this.syntaxSandbox.validateTS(content, fileSpec.path);/' packages/analysis-agent/src/agent.ts

echo "[SUCCESS] Governança corrigida. O loop de rejeição deve parar."
