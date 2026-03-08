import type { RichManifestItem, FileCategory } from "../types/rich-schemas.js";

/**
 * Result of category validation
 */
export interface CategoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  distribution: Record<string, number>;
}

/**
 * CategoryValidator - Valida distribuição arquitetural de forma GENÉRICA
 *
 * Este validador NÃO prescreve quantos arquivos cada categoria deve ter.
 * Ele apenas verifica:
 * 1. Se existem categorias mínimas para um projeto funcional
 * 2. Se a distribuição não está extremamente desequilibrada
 *
 * Categorias verificadas (presença, não quantidade):
 * - CONFIG: Todo projeto precisa de configuração
 * - DOCS: Todo projeto precisa de documentação mínima
 *
 * Categorias opcionais mas recomendadas:
 * - TESTS: Projetos profissionais devem ter testes
 * - DOMAIN/APPLICATION: Projetos com lógica devem ter essas camadas
 *
 * @class CategoryValidator
 */
export class CategoryValidator {
  /**
   * Valida a distribuição de categorias no manifesto
   */
  public validate(manifest: RichManifestItem[]): CategoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Contar arquivos por categoria
    const distribution: Record<string, number> = {};
    for (const item of manifest) {
      const cat = item.category || "UNKNOWN";
      distribution[cat] = (distribution[cat] || 0) + 1;
    }

    // Verificar categorias obrigatórias (presença apenas)
    const requiredCategories: FileCategory[] = ["CONFIG"];
    for (const cat of requiredCategories) {
      if (!distribution[cat] || distribution[cat] < 1) {
        errors.push(
          `Missing required category: ${cat}. Every project needs at least one configuration file.`
        );
      }
    }

    // Verificar categorias recomendadas (warnings apenas)
    if (!distribution["DOCS"] || distribution["DOCS"] < 1) {
      warnings.push(
        "Missing DOCS category. Consider adding at least a README.md."
      );
    }

    if (!distribution["TESTS"] || distribution["TESTS"] < 1) {
      warnings.push(
        "Missing TESTS category. Professional projects should have tests."
      );
    }

    // Verificar se há alguma categoria de código
    const codeCategories: FileCategory[] = [
      "DOMAIN",
      "APPLICATION",
      "INFRASTRUCTURE",
      "UI",
    ];
    const hasCodeCategory = codeCategories.some(
      (cat) => distribution[cat] && distribution[cat] > 0
    );

    if (!hasCodeCategory) {
      warnings.push(
        "No code categories found (DOMAIN, APPLICATION, INFRASTRUCTURE, UI). " +
          "Most projects should have at least one of these."
      );
    }

    // Verificar distribuição extremamente desequilibrada
    const totalFiles = manifest.length;
    if (totalFiles > 10) {
      // Apenas para projetos maiores
      const largestCategory = Math.max(...Object.values(distribution));
      const ratio = largestCategory / totalFiles;

      if (ratio > 0.8) {
        warnings.push(
          `Category distribution is heavily skewed: one category has ${Math.round(ratio * 100)}% of files. ` +
            "Consider if this is intentional."
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      distribution,
    };
  }

  /**
   * Valida distribuição mínima para projetos específicos
   *
   * @param manifest - Manifesto a validar
   * @param projectType - Tipo de projeto (frontend, backend, fullstack, library)
   */
  public validateForProjectType(
    manifest: RichManifestItem[],
    projectType: "frontend" | "backend" | "fullstack" | "library"
  ): CategoryValidationResult {
    const baseResult = this.validate(manifest);

    const distribution = baseResult.distribution;
    const warnings = [...baseResult.warnings];

    // Verificações específicas por tipo (ainda genéricas, não para estruturas de dados)
    switch (projectType) {
      case "frontend":
        if (!distribution["UI"] || distribution["UI"] < 1) {
          warnings.push(
            "Frontend project missing UI category. Expected at least one UI component."
          );
        }
        break;

      case "backend":
        if (!distribution["INFRASTRUCTURE"] || distribution["INFRASTRUCTURE"] < 1) {
          warnings.push(
            "Backend project missing INFRASTRUCTURE category. " +
              "Expected at least one infrastructure file (database, API routes, etc.)."
          );
        }
        break;

      case "fullstack":
        if (!distribution["UI"] || !distribution["INFRASTRUCTURE"]) {
          warnings.push(
            "Fullstack project should have both UI and INFRASTRUCTURE categories."
          );
        }
        break;

      case "library":
        if (!distribution["DOMAIN"] || distribution["DOMAIN"] < 1) {
          warnings.push(
            "Library project missing DOMAIN category. " +
              "Expected at least one domain file with core logic."
          );
        }
        break;
    }

    return {
      ...baseResult,
      warnings,
    };
  }
}

/**
 * Singleton instance for global use
 */
export const categoryValidator = new CategoryValidator();
