import type {
  RichArchitecture,
  FileCategory,
  Criticality,
  RichManifestItem,
} from "../types/rich-schemas.js";

/**
 * Type for the addFile helper function
 */
type AddFileFunction = (
  path: string,
  purpose: string,
  category: FileCategory,
  criticality?: Criticality
) => void;

/**
 * BaseProjectAuditor - Audita e corrige o manifesto com arquivos essenciais GENÉRICOS
 *
 * Este auditor NÃO é especializado para nenhum tipo de projeto.
 * Ele apenas garante que arquivos básicos universais estejam presentes.
 *
 * Arquivos injetados:
 * - Documentação: README.md
 * - Configuração: package.json, tsconfig.json (se TypeScript)
 * - DevOps: CI workflow (se GitHub)
 *
 * Este auditor NÃO injeta:
 * - Arquivos específicos de domínio (visualização, animação, etc.)
 * - Componentes específicos de framework
 * - Estrutura de diretórios específica
 *
 * @class BaseProjectAuditor
 */
export class BaseProjectAuditor {
  /**
   * Audita a arquitetura e injeta arquivos básicos se estiverem faltando.
   *
   * @param architecture - The architecture to audit
   * @returns Fixed architecture with essential files
   */
  public auditAndFix(architecture: RichArchitecture): RichArchitecture {
    const fixedManifest: RichManifestItem[] = [...architecture.manifest];
    const stack = architecture.stack;

    const manifestPaths = new Set(
      fixedManifest.map((f) => f.path.toLowerCase())
    );

    const addFile: AddFileFunction = (
      path: string,
      purpose: string,
      category: FileCategory,
      criticality: Criticality = "HIGH"
    ) => {
      if (!manifestPaths.has(path.toLowerCase())) {
        fixedManifest.push({ path, purpose, category, criticality });
        manifestPaths.add(path.toLowerCase());
      }
    };

    // 1. Documentação Obrigatória (Universal)
    addFile("README.md", "Project documentation and setup instructions", "DOCS");

    // 2. Configuração Básica (Baseada na Stack)
    if (this.isNodeProject(stack.runtime)) {
      addFile("package.json", "Project dependencies and scripts", "CONFIG");
    }

    if (this.isTypeScriptProject(stack.language)) {
      addFile("tsconfig.json", "TypeScript compiler configuration", "CONFIG");
    }

    // 3. DevOps Básico (Universal para projetos modernos)
    addFile(".github/workflows/ci.yml", "CI pipeline configuration", "DEVOPS", "MEDIUM");
    addFile(".gitignore", "Git ignore patterns", "CONFIG", "LOW");

    // 4. Entry point (se frontend React)
    if (this.isReactProject(stack.framework)) {
      this.ensureReactEntrypoint(fixedManifest, manifestPaths, addFile);
    }

    return {
      ...architecture,
      manifest: fixedManifest,
    };
  }

  /**
   * Verifica se é um projeto Node.js
   */
  private isNodeProject(runtime: string): boolean {
    const lower = runtime.toLowerCase();
    return lower.includes("node") || lower.includes("bun") || lower.includes("deno");
  }

  /**
   * Verifica se é um projeto TypeScript
   */
  private isTypeScriptProject(language: string): boolean {
    const lower = language.toLowerCase();
    return lower.includes("typescript") || lower.includes("ts");
  }

  /**
   * Verifica se é um projeto React
   */
  private isReactProject(framework: string): boolean {
    const lower = framework.toLowerCase();
    return lower.includes("react") || lower.includes("next") || lower.includes("remix");
  }

  /**
   * Garante que projetos React tenham entry point
   */
  private ensureReactEntrypoint(
    manifest: RichManifestItem[],
    paths: Set<string>,
    addFile: AddFileFunction
  ): void {
    const hasEntrypoint =
      paths.has("src/main.tsx") ||
      paths.has("src/main.ts") ||
      paths.has("src/index.tsx") ||
      paths.has("src/index.ts") ||
      paths.has("app/page.tsx") || // Next.js
      paths.has("pages/index.tsx"); // Next.js pages

    if (!hasEntrypoint) {
      addFile("src/main.tsx", "Application entrypoint", "APPLICATION");
    }

    // App component
    const hasApp =
      paths.has("src/app.tsx") ||
      paths.has("src/app.ts") ||
      paths.has("app/layout.tsx"); // Next.js

    if (!hasApp) {
      addFile("src/App.tsx", "Root application component", "APPLICATION");
    }
  }
}

/**
 * Singleton instance for global use
 */
export const baseProjectAuditor = new BaseProjectAuditor();
