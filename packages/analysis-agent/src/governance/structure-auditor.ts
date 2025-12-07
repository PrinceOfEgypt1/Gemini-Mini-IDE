import { RichArchitecture } from "../types/rich-schemas.js";

export class StructureAuditor {
  /**
   * Audita a arquitetura e injeta arquivos obrigatórios se estiverem faltando.
   */
  public auditAndFix(architecture: RichArchitecture): RichArchitecture {
    const fixedManifest = [...architecture.manifest];
    const stack = architecture.stack;
    
    // Helper para verificar existência
    const hasFile = (pattern: RegExp) => fixedManifest.some(f => pattern.test(f.path));

    // Helper para adicionar arquivo
    const addFile = (path: string, purpose: string, category: "CONFIG" | "DOCS" | "TESTS" | "APPLICATION") => {
      if (!hasFile(new RegExp(path.replace(".", "\\.")))) {
        fixedManifest.push({
          path,
          purpose,
          category,
          criticality: "HIGH"
        });
      }
    };

    // 1. Documentação Obrigatória
    addFile("README.md", "Documentation entry point", "DOCS");
    addFile("USER_STORIES.md", "Project requirements and stories", "DOCS");

    // 2. Configuração Básica (Baseado na Stack)
    if (stack.runtime.toLowerCase().includes("node")) {
      addFile("package.json", "Project dependencies and scripts", "CONFIG");
    }
    
    if (stack.language.toLowerCase().includes("typescript")) {
      addFile("tsconfig.json", "TypeScript compiler configuration", "CONFIG");
    }

    // 3. Framework specific checks
    if (stack.framework.toLowerCase().includes("react")) {
      addFile("vite.config.ts", "Vite build configuration", "CONFIG");
      // Verifica se existe algum entrypoint
      if (!hasFile(/src\/main\.tsx?/) && !hasFile(/src\/index\.tsx?/)) {
        addFile("src/main.tsx", "Application entrypoint", "APPLICATION");
      }
    }

    return {
      ...architecture,
      manifest: fixedManifest
    };
  }
}
