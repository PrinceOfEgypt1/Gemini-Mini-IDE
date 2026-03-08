/**
 * CompletenessValidator - Anti-lazy code validator
 *
 * Enforces code quality by rejecting:
 * - Placeholder markers (TODO, FIXME, TBD, WIP, ...)
 * - Forbidden types (any, as any)
 * - Suppression comments without justification
 * - Missing exports in source files
 * - Missing JSDoc on public exports
 */

import type { RichManifestItem } from "../types/rich-schemas.js";

/**
 * Result of validation.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates code completeness and quality.
 */
export class CompletenessValidator {
  /**
   * Validates code content against quality rules.
   * @param code - The source code to validate
   * @param filePath - The file path (used for context-aware validation)
   * @returns Validation result with errors if any
   */
  public validate(code: string, filePath: string): ValidationResult {
    const errors: string[] = [];
    const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase();

    // Skip validation for non-code files
    if (this.isNonCodeFile(normalizedPath)) {
      return { isValid: true, errors: [] };
    }

    const isTsLike =
      normalizedPath.endsWith(".ts") ||
      normalizedPath.endsWith(".tsx") ||
      normalizedPath.endsWith(".js") ||
      normalizedPath.endsWith(".jsx");

    const isTestFile =
      normalizedPath.includes(".test.") ||
      normalizedPath.includes(".spec.") ||
      normalizedPath.includes("/__tests__/") ||
      normalizedPath.includes("/test/");

    const isConfigFile =
      normalizedPath.includes("config") ||
      normalizedPath.includes(".eslintrc") ||
      normalizedPath.includes(".prettierrc") ||
      normalizedPath.includes("tsconfig");

    const isDTS = normalizedPath.endsWith(".d.ts");
    const isEntrypoint = this.isEntrypoint(normalizedPath);

    // 1. Check for placeholder markers
    this.checkPlaceholders(code, errors);

    // 2. Check for forbidden types (not in test/config/dts files)
    if (isTsLike && !isTestFile && !isConfigFile && !isDTS) {
      this.checkForbiddenTypes(code, errors);
    }

    // 3. Check for suppression comments
    if (isTsLike) {
      this.checkSuppressions(code, errors);
    }

    // 4. Check for exports (source files only, not tests/configs/entrypoints)
    if (isTsLike && !isTestFile && !isConfigFile && !isDTS && !isEntrypoint) {
      this.checkExports(code, errors);
    }

    // 5. Check for JSDoc on exports (not in test/config/dts/entrypoints)
    if (isTsLike && !isTestFile && !isConfigFile && !isDTS && !isEntrypoint) {
      this.checkJSDoc(code, errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Legacy method for backward compatibility.
   */
  public validateFileContent(content: string, path: string, _manifest: RichManifestItem[]): string[] {
    return this.validate(content, path).errors;
  }

  private isNonCodeFile(path: string): boolean {
    const nonCodeExtensions = [".json", ".md", ".yml", ".yaml", ".css", ".scss", ".html", ".svg"];
    return nonCodeExtensions.some(ext => path.endsWith(ext)) || path.endsWith(".d.ts");
  }

  private isEntrypoint(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, "/").toLowerCase();

    // Exclude nested index files
    if (
      normalizedPath.includes("/utils/") ||
      normalizedPath.includes("/lib/") ||
      normalizedPath.includes("/helpers/") ||
      normalizedPath.includes("/services/") ||
      normalizedPath.includes("/components/")
    ) {
      return false;
    }

    // Monorepo: packages/<name>/src/(main|index).tsx
    if (normalizedPath.startsWith("packages/")) {
      const parts = normalizedPath.split("/");
      if (parts.length === 4 && parts[2] === "src") {
        return /^(main|index)\.(tsx?|jsx?)$/.test(parts[3] || "");
      }
      return false;
    }

    // Standard: src/(main|index).tsx
    return /^src\/(main|index)\.(tsx?|jsx?)$/.test(normalizedPath);
  }

  private checkPlaceholders(code: string, errors: string[]): void {
    if (/\/\/\s*TODO\b/i.test(code)) errors.push("Contains TODO marker");
    if (/\/\/\s*FIXME\b/i.test(code)) errors.push("Contains FIXME marker");
    if (/\bTBD\b/i.test(code)) errors.push("Contains TBD placeholder");
    if (/\bWIP\b/i.test(code)) errors.push("Contains WIP marker");

    // Check for standalone ... placeholder (not spread)
    const lines = code.split("\n");
    for (const line of lines) {
      if (/\{[^}]*\.\.\.\w+/.test(line)) continue;
      if (/\[[^\]]*\.\.\.\w+/.test(line)) continue;
      if (/\(\s*\.\.\.\w+/.test(line)) continue;
      if (/,\s*\.\.\.\w+/.test(line)) continue;
      if (line.trim() === "..." || /\/\/.*\.\.\./.test(line)) {
        errors.push("Contains '...' placeholder");
        break;
      }
    }
  }

  private checkForbiddenTypes(code: string, errors: string[]): void {
    const lines = code.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      if (/:\s*any\b/.test(line) || /<any[>,]/.test(line)) {
        errors.push("Contains forbidden type 'any'");
        break;
      }
    }
    if (/\bas\s+any\b/.test(code)) {
      errors.push("Contains forbidden cast 'as any'");
    }
  }

  private checkSuppressions(code: string, errors: string[]): void {
    if (/@ts-ignore\b/.test(code)) errors.push("Contains @ts-ignore (forbidden)");
    if (/@ts-nocheck\b/.test(code)) errors.push("Contains @ts-nocheck (forbidden)");

    const lines = code.split("\n");
    for (const line of lines) {
      if (/@ts-expect-error\b/.test(line)) {
        const after = line.split("@ts-expect-error")[1] || "";
        const justification = after.replace(/^[\s-]*/, "").trim();
        if (justification.length < 5) {
          errors.push("@ts-expect-error must include a justification on the same line");
          break;
        }
      }
    }
  }

  private checkExports(code: string, errors: string[]): void {
    const hasExport =
      /\bexport\s+(default\s+)?(const|let|var|function|class|interface|type|enum|async)\b/.test(code) ||
      /\bexport\s+\{/.test(code) ||
      /\bmodule\.exports\b/.test(code);
    if (!hasExport) errors.push("Module does not export anything");
  }

  private checkJSDoc(code: string, errors: string[]): void {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || "";
      if (!/^\s*export\s+(default\s+)?(async\s+)?(class|function|interface|type|const|let|var|enum)\b/.test(line)) continue;

      let hasJSDoc = false;
      let j = i - 1;
      while (j >= 0 && ((lines[j] || "").trim() === "" || (lines[j] || "").trim().startsWith("//"))) j--;

      if (j >= 0 && (lines[j] || "").trim().endsWith("*/")) {
        let k = j;
        while (k >= 0 && k > j - 30) {
          if ((lines[k] || "").trim().startsWith("/**")) { hasJSDoc = true; break; }
          if ((lines[k] || "").trim().startsWith("export ")) break;
          k--;
        }
      }

      if (!hasJSDoc) {
        errors.push(`Missing JSDoc for exported declaration at line ${i + 1}`);
        break;
      }
    }
  }
}
