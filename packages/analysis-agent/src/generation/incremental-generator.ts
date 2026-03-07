import type { IIncrementalLLMClient } from "../llm-clients/llm-client.interface.js";
import type { RichArchitecture, RichUserStory } from "../types/rich-schemas.js";
import { ManifestBatcher } from "./manifest-batcher.js";
import { BatchValidator } from "./batch-validator.js";
import { ContextAccumulator } from "./context-accumulator.js";
import type { BatchFile, BatchResult, LLMCodeGenerationResult, LLMGeneratedFile } from "../types/generation-types.js";

export class IncrementalGenerator {
  private readonly manifestBatcher: ManifestBatcher;
  private readonly contextAccumulator: ContextAccumulator;
  private readonly batchValidator: BatchValidator;

  constructor(private llmClient: IIncrementalLLMClient) {
    this.manifestBatcher = new ManifestBatcher();
    this.contextAccumulator = new ContextAccumulator();
    this.batchValidator = new BatchValidator();
  }

  public async *generate(architecture: RichArchitecture, userStories: RichUserStory[]): AsyncGenerator<BatchResult> {
    const batches = this.manifestBatcher.createBatches(architecture.manifest);

    for (const batch of batches) {
      const batchResult = await this.generateBatch(batch, architecture, userStories);
      this.contextAccumulator.addFiles(batchResult.generatedFiles);
      yield batchResult;
    }
  }

  private async generateBatch(batch: BatchFile[], architecture: RichArchitecture, userStories: RichUserStory[]): Promise<BatchResult> {
    const prompt = this.buildBatchPrompt(batch, architecture, userStories);
    let accumulatedJson = "";
    const generatedFiles: LLMGeneratedFile[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for await (const chunk of this.llmClient.incrementalCompletion(prompt)) {
        accumulatedJson += chunk.content;
      }

      const parsed = JSON.parse(accumulatedJson) as LLMCodeGenerationResult;
      const validation = this.batchValidator.validate(parsed.files);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);

      if (validation.errors.length === 0) {
        generatedFiles.push(...parsed.files);
      }

    } catch (e: any) {
      errors.push(`Failed to parse LLM output for batch: ${e.message}`);
    }

    return { generatedFiles, errors, warnings };
  }

  private buildBatchPrompt(batch: BatchFile[], architecture: RichArchitecture, userStories: RichUserStory[]): { role: "system" | "user" | "assistant"; content: string; }[] {
    const previousContext = this.contextAccumulator.buildContextForNextBatch();
    const fileList = batch.map(f => `  - ${f.path}: ${f.purpose}`).join("\n");

    const systemPrompt = `You are an expert software engineer following NASA-level governance. Your task is to generate the code for a batch of files based on the provided architecture and user stories. You MUST generate a JSON object containing an array of files. Each file object must have 'path', 'content', 'reasoning', and 'language'. DO NOT generate incomplete code, placeholders, or comments like 'implement here'. The code must be complete and production-ready. Adhere strictly to the provided file list.\n\n${previousContext}`;

    const userPrompt = `Generate the following files:\n${fileList}\n\nARCHITECTURE:\n${JSON.stringify(architecture, null, 2)}\n\nUSER STORIES:\n${JSON.stringify(userStories, null, 2)}`;

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }
}
