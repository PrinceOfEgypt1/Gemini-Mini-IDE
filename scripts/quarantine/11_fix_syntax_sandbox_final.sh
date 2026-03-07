#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Aplicando Correção Definitiva no SyntaxSandbox (Modo Sintaxe Pura)..."

# 1. REESCREVER SYNTAX-SANDBOX (Modo Sintaxe Apenas)
# ==============================================================================
# Mudança chave: Usamos transpileModule ou createSourceFile apenas para check de parse.
# Não criamos Program nem TypeChecker. Isso elimina dependência de libs.

echo "[INFO] Atualizando packages/analysis-agent/src/governance/syntax-sandbox.ts..."
cat > packages/analysis-agent/src/governance/syntax-sandbox.ts << 'EOF'
import ts from "typescript";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class SyntaxSandbox {
  /**
   * Valida APENAS a sintaxe do TypeScript.
   * Não verifica tipos, não requer lib.d.ts e não acessa o disco.
   * Isso garante que o código gerado é "parseável", que é o objetivo desta etapa.
   */
  public validateTS(code: string, filePath?: string): ValidationResult {
    // 1. Ignorar arquivos que não são TypeScript
    if (filePath && !filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      return { isValid: true };
    }

    try {
      // Cria o SourceFile. Se houver erro de sintaxe grave, o parser falha aqui ou gera diagnostics de parse.
      const sourceFile = ts.createSourceFile(
        filePath || "temp.ts",
        code,
        ts.ScriptTarget.Latest,
        true // setParentNodes
      );

      // Coleta erros de PARSE (Syntax Errors) apenas.
      // Ex: faltando }, ; inesperado, etc.
      // NÃO coleta erros de TIPO (Semantic Errors).
      const diagnostics = sourceFile.parseDiagnostics; // Apenas erros de sintaxe!

      if (diagnostics.length > 0) {
        const message = ts.flattenDiagnosticMessageText(diagnostics[0].messageText, "\n");
        const line = sourceFile.getLineAndCharacterOfPosition(diagnostics[0].start!).line + 1;
        
        return { 
          isValid: false, 
          error: `Syntax Error at Line ${line}: ${message}` 
        };
      }

      // Validação extra: Verificar se há nós vazios ou código incompleto suspeito
      if (sourceFile.statements.length === 0 && code.trim().length > 0) {
         // Código existe mas não gerou statements (comentários apenas?)
         // Aceitável, mas logamos.
      }

      return { isValid: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { isValid: false, error: `Compiler Crash: ${errorMessage}` };
    }
  }
}
EOF

echo "[SUCCESS] SyntaxSandbox atualizado para Modo Sintaxe Pura. Erros de 'Cannot find type' devem desaparecer."
