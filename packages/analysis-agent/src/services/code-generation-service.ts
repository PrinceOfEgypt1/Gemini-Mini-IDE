import { IncrementalGenerator } from "../generation/incremental-generator.js";
import type { IIncrementalLLMClient } from "../llm-clients/llm-client.interface.js";
import type { BatchGeneratedFile } from "../types/generation-types.js";
import type { RichArchitecture, RichUserStory } from "../types/rich-schemas.js";
import type { ValidationService } from "./validation-service.js";
import type { PromptOrchestrator } from "./prompt-orchestrator.js";

export class CodeGenerationService {
  private readonly incrementalGenerator: IncrementalGenerator;

  constructor(
    llmClient: IIncrementalLLMClient,
    _promptOrchestrator: PromptOrchestrator,
    _validationService: ValidationService
  ) {
    this.incrementalGenerator = new IncrementalGenerator(llmClient);
    // promptOrchestrator and validationService reserved for future validation pipeline
  }

  /**
   * Gera código a partir da arquitetura e user stories.
   * Consome o AsyncGenerator do IncrementalGenerator e coleta todos os arquivos.
   */
  public async generateCode(
    architecture: RichArchitecture,
    userStories: RichUserStory[]
  ): Promise<BatchGeneratedFile[]> {
    const allFiles: BatchGeneratedFile[] = [];
    const allErrors: string[] = [];

    // Consome o generator e acumula resultados
    for await (const batchResult of this.incrementalGenerator.generate(architecture, userStories)) {
      // Converte LLMGeneratedFile para BatchGeneratedFile
      for (const file of batchResult.generatedFiles) {
        allFiles.push({
          path: file.path,
          content: file.content,
        });
      }
      allErrors.push(...batchResult.errors);
    }

    if (allErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[CodeGenerationService] Erros durante geração:", allErrors);
    }

    return allFiles;
  }
}
