import type { RichManifestItem } from "../types/rich-schemas.js";

export class CompletenessValidator {
  public validateFileContent(content: string, path: string, manifest: RichManifestItem[]): string[] {
    const errors: string[] = [];
    const lowerCaseContent = content.toLowerCase();

    if (lowerCaseContent.includes("// todo") || lowerCaseContent.includes("// implement")) {
      errors.push(`File ${path} contains TODOs or implementation placeholders.`);
    }

    if (path.endsWith(".ts") && !path.endsWith(".d.ts")) {
      const testFile = path.replace(".ts", ".test.ts");
      if (!manifest.some(item => item.path === testFile)) {
        errors.push(`Missing test file for ${path}.`);
      }
    }

    return errors;
  }
}
