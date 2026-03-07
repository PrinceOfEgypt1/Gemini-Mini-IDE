import type { LLMGeneratedFile } from "../types/generation-types.js";

export class BatchValidator {
  public validate(files: LLMGeneratedFile[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!files || !Array.isArray(files)) {
      errors.push("LLM output is not a valid array of files.");
      return { errors, warnings };
    }

    for (const f of files) {
      if (!f.path || !f.content) {
        warnings.push(`A generated file is missing 'path' or 'content'.`);
      }
    }

    return { errors, warnings };
  }
}
