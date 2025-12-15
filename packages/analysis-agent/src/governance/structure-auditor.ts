import type { RichArchitecture, FileCategory, Criticality, RichManifestItem } from "../types/rich-schemas.js";

export class StructureAuditor {
  /**
   * Audita a arquitetura e injeta arquivos obrigatórios se estiverem faltando.
   */
  public auditAndFix(architecture: RichArchitecture): RichArchitecture {
    const fixedManifest: RichManifestItem[] = [...architecture.manifest];
    const stack = architecture.stack;

    const manifestPaths = new Set(fixedManifest.map(f => f.path));

    const addFile = (path: string, purpose: string, category: FileCategory, criticality: Criticality = "HIGH") => {
      if (!manifestPaths.has(path)) {
        fixedManifest.push({ path, purpose, category, criticality });
        manifestPaths.add(path);
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
      const hasEntrypoint =
        fixedManifest.some(f => f.path === "src/main.tsx") ||
        fixedManifest.some(f => f.path === "src/main.ts") ||
        fixedManifest.some(f => f.path === "src/index.tsx") ||
        fixedManifest.some(f => f.path === "src/index.ts");

      if (!hasEntrypoint) {
        addFile("src/main.tsx", "Application entrypoint", "APPLICATION");
      }
    }

    return {
      ...architecture,
      manifest: fixedManifest
    };
  }
}
