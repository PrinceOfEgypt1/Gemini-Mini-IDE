import { SyntaxSandbox } from "../governance/syntax-sandbox.js";
import { CompletenessValidator } from "../governance/completeness-validator.js";
import { validateIntegrity } from "../validators/integrity-validator.js";
import { validateManifest } from "../validators/manifest-validator.js";
import type { LLMGeneratedFile } from "../types/generation-types.js";
import type { RichArchitecture } from "../types/rich-schemas.js";

export class ValidationService {
  private readonly syntaxSandbox: SyntaxSandbox;
  private readonly completenessValidator: CompletenessValidator;

  constructor() {
    this.syntaxSandbox = new SyntaxSandbox();
    this.completenessValidator = new CompletenessValidator();
  }

  public validateGeneratedCode(files: LLMGeneratedFile[], architecture: RichArchitecture): string[] {
    const errors: string[] = [];

    for (const file of files) {
      const syntaxResult = this.syntaxSandbox.validateTS(file.content, file.path);
      if (!syntaxResult.isValid) {
        errors.push(`Syntax error in ${file.path}: ${syntaxResult.error}`);
      }

      const completenessErrors = this.completenessValidator.validateFileContent(file.content, file.path, architecture.manifest);
      errors.push(...completenessErrors.map(e => `Completeness error in ${file.path}: ${e}`));
    }

    const integrityResult = validateIntegrity(architecture.manifest, files);
    if (!integrityResult.valid) {
      errors.push(...integrityResult.warnings);
    }

    return errors;
  }

  public validateManifest(architecture: RichArchitecture, userPrompt: string): string[] {
    const result = validateManifest(architecture.manifest, userPrompt);
    return result.errors.map(e => e.message);
  }
}
