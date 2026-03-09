// Re-exports explícitos para evitar conflito de nomes (ValidationResult)
export { CompletenessValidator } from "./completeness-validator.js";
export type { ValidationResult as CompletenessValidationResult } from "./completeness-validator.js";

export { SyntaxSandbox } from "./syntax-sandbox.js";
export type { ValidationResult as SyntaxValidationResult } from "./syntax-sandbox.js";

export * from "./contract-validator.js";
export * from "./base-project-auditor.js";
export * from "./category-validator.js";
