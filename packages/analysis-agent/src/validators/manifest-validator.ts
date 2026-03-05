import type { RichManifestItem } from "../types/rich-schemas.js";

export interface ValidationError {
  structure: string;
  type: string;
  expected: number | string;
  actual: number | string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validates basic manifest structure (not content - that's the LLM's job)
 */
export function validateManifest(
  manifest: RichManifestItem[],
  _userPrompt: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Only validate structural requirements, not content
  if (!manifest || manifest.length === 0) {
    errors.push({
      structure: "MANIFEST",
      type: "EMPTY",
      expected: "At least 1 file",
      actual: 0,
      message: "Manifest is empty"
    });
  }

  // Validate each item has required fields
  for (const item of manifest) {
    if (!item.path) {
      errors.push({
        structure: "MANIFEST_ITEM",
        type: "MISSING_PATH",
        expected: "path",
        actual: "undefined",
        message: "Manifest item missing path"
      });
    }
    if (!item.purpose) {
      warnings.push(`File ${item.path} is missing purpose description`);
    }
    if (!item.category) {
      warnings.push(`File ${item.path} is missing category`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
