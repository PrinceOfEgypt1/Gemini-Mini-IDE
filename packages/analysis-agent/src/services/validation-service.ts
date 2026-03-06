import { CompletenessValidator } from "../governance/completeness-validator.js";
import { validateIntegrity } from "../validators/integrity-validator.js";
import { validateManifest, type ValidationResult as ManifestValidationResult } from "../validators/manifest-validator.js";
import { SyntaxSandbox } from "../governance/syntax-sandbox.js";
import type { RichArchitecture } from "../types/rich-schemas.js";
import type { BatchGeneratedFile } from "../generation/incremental-generator.js";

export class ValidationService {
  private readonly completenessValidator: CompletenessValidator;
  private readonly syntaxSandbox: SyntaxSandbox;

  constructor() {
    this.completenessValidator = new CompletenessValidator();
    this.syntaxSandbox = new SyntaxSandbox();
  }

  public async validateManifest(architecture: RichArchitecture): Promise<{ isValid: boolean; errors: string[] }> {
    const validation: ManifestValidationResult = validateManifest(architecture.manifest, "");
    if (!validation.valid) {
      const errors = validation.errors.map(err => `[Manifest Validation] ${err.structure}: ${err.message}`);
      return { isValid: false, errors };
    }
    return { isValid: true, errors: [] };
  }

  public validateGeneratedCode(files: BatchGeneratedFile[], architecture: RichArchitecture): string[] {
    const errors: string[] = [];

    for (const file of files) {
      const manifestItem = architecture.manifest.find(m => m.path === file.path);
      if (!manifestItem) {
        errors.push(`[File Validation] Arquivo gerado '${file.path}' não encontrado no manifesto.`);
        continue;
      }

      // Validar sintaxe
      const syntaxValidation = this.syntaxSandbox.validateTS(file.content, file.path);
      if (!syntaxValidation.isValid) {
        errors.push(`[Syntax Validation] ${file.path}: ${syntaxValidation.error}`);
      }

      // Validar completude (se o arquivo gerado atende ao propósito do manifesto)
      const completenessValidation = this.completenessValidator.validate(file.content, file.path);
      if (!completenessValidation.isValid) {
        completenessValidation.errors.forEach(err => {
          errors.push(`[Completeness Validation] ${file.path}: ${err}`);
        });
      }
    }

    // Validar integridade (manifest vs arquivos gerados)
    const integrityValidation = validateIntegrity(architecture.manifest, files);
    if (!integrityValidation.valid) {
      errors.push(...integrityValidation.warnings);
    }

    return errors;
  }
}
