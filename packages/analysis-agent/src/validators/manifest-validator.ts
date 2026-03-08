import type { RichManifestItem } from "../types/rich-schemas.js";
import { categoryValidator } from "../governance/category-validator.js";

/**
 * Validation error with structured information
 */
export interface ValidationError {
  structure: string;
  type: string;
  expected: number | string;
  actual: number | string;
  message: string;
}

/**
 * Result of manifest validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  categoryDistribution?: Record<string, number>;
}

/**
 * Validates manifest structure and architectural distribution.
 *
 * This validator is GENERIC and does NOT:
 * - Check for specific data structures
 * - Require specific method counts
 * - Enforce domain-specific rules
 *
 * It DOES:
 * - Verify basic structural requirements (path, purpose, category)
 * - Validate architectural category distribution
 * - Warn on missing essential categories (CONFIG, DOCS, TESTS)
 *
 * @param manifest - Array of manifest items to validate
 * @param _userPrompt - User prompt (reserved for future generic analysis)
 * @returns Validation result with errors, warnings, and category distribution
 */
export function validateManifest(
  manifest: RichManifestItem[],
  _userPrompt: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Validate basic structure
  if (!manifest || manifest.length === 0) {
    errors.push({
      structure: "MANIFEST",
      type: "EMPTY",
      expected: "At least 1 file",
      actual: 0,
      message: "Manifest is empty"
    });
    return { valid: false, errors, warnings };
  }

  // 2. Validate each item has required fields
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

  // 3. Validate category distribution (GENERIC, not domain-specific)
  const categoryResult = categoryValidator.validate(manifest);

  // Convert category errors to our format
  for (const error of categoryResult.errors) {
    errors.push({
      structure: "CATEGORY",
      type: "MISSING_CATEGORY",
      expected: "Required category",
      actual: "Not found",
      message: error
    });
  }

  // Add category warnings
  warnings.push(...categoryResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    categoryDistribution: categoryResult.distribution
  };
}
