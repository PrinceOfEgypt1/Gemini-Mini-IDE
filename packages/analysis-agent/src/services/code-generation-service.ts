import { IncrementalGenerator, type IncrementalGenerationResult, type LLMClient } from "../generation/incremental-generator.js";
import { ValidationService } from "./validation-service.js";
import { PromptOrchestrator } from "./prompt-orchestrator.js";

export class CodeGenerationService {
  private readonly incrementalGenerator: IncrementalGenerator;
  private readonly promptOrchestrator: PromptOrchestrator;
  private readonly validationService: ValidationService;

  constructor(
    llmClient: LLMClient,
    promptOrchestrator: PromptOrchestrator,
    validationService: ValidationService
  ) {
    this.incrementalGenerator = new IncrementalGenerator(llmClient);
    this.promptOrchestrator = promptOrchestrator;
    this.validationService = validationService;
  }

  public async generateCode(
    onProgress?: (batchName: string, progress: number) => void
  ): Promise<IncrementalGenerationResult> {
    const architecture = this.promptOrchestrator.getArchitecture();
    const userStories = this.promptOrchestrator.getUserStories();
    const userPrompt = this.promptOrchestrator.getUserPrompt();

    if (!architecture || !userStories || !userPrompt) {
      throw new Error("Contexto de geracao incompleto no PromptOrchestrator.");
    }

    const result = await this.incrementalGenerator.generate(
      architecture,
      userStories,
      userPrompt,
      onProgress
    );

    // Implementar o Quality Gate
    const validationErrors = this.validationService.validateGeneratedCode(result.allFiles, architecture);
    if (validationErrors.length > 0) {
      result.success = false;
      result.errors.push(...validationErrors);
    }

    return result;
  }
}
