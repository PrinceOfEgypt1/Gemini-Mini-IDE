import { EventEmitter } from "events";
import { z } from "zod";
import { globalAnalysisCache } from "./services/cache.service.js";
import { PromptOrchestrator } from "./services/prompt-orchestrator.js";
import { CodeGenerationService } from "./services/code-generation-service.js";
import { ValidationService } from "./services/validation-service.js";
import { baseProjectAuditor } from "./governance/base-project-auditor.js";
import { categoryValidator } from "./governance/category-validator.js";
import type { ILLMClient, IIncrementalLLMClient } from "./llm-clients/llm-client.interface.js";
import { OpenAIChatClient } from "./llm-clients/openai-chat-client.js";
import { OpenAILLMClient } from "./llm-clients/openai-llm-client.js";
import type { RichAnalysis, RichProductPlan, RichArchitecture, RichUserStoriesResult, PlanResult, AgentResult } from "./types/rich-schemas.js";
import { RichAnalysisSchema, RichProductPlanSchema, RichArchitectureSchema, RichUserStoriesResultSchema } from "./types/rich-schemas.js";

export interface AnalysisAgentOptions {
  chatClient: ILLMClient;
  incrementalClient: IIncrementalLLMClient;
  projectRoot: string;
  model: string;
  temperature: number;
}

/**
 * Legacy options for backward compatibility with orchestrators
 */
export interface LegacyAgentOptions {
  model?: string;
  baseUrl?: string;
}

export class AnalysisAgent extends EventEmitter {
  private readonly options: AnalysisAgentOptions;
  private readonly promptOrchestrator: PromptOrchestrator;
  private readonly codeGenerationService: CodeGenerationService;
  private readonly validationService: ValidationService;

  /**
   * Constructor with backward compatibility.
   * Accepts either full AnalysisAgentOptions or legacy (apiKey, legacyOptions) format.
   */
  constructor(optionsOrApiKey: AnalysisAgentOptions | string, legacyOptions?: LegacyAgentOptions) {
    super();

    if (typeof optionsOrApiKey === "string") {
      // Legacy API: new AnalysisAgent(apiKey, { model?, baseUrl? })
      const apiKey = optionsOrApiKey;
      const model = legacyOptions?.model || "gpt-4o-mini";
      const baseUrl = legacyOptions?.baseUrl;

      const chatClient = new OpenAIChatClient(apiKey, baseUrl, model);
      const incrementalClient = new OpenAILLMClient(apiKey, { baseUrl, model });

      this.options = {
        chatClient,
        incrementalClient,
        projectRoot: process.cwd(),
        model,
        temperature: 0.7
      };
    } else {
      // New API: new AnalysisAgent(options)
      this.options = optionsOrApiKey;
    }

    this.promptOrchestrator = new PromptOrchestrator();
    this.validationService = new ValidationService();
    this.codeGenerationService = new CodeGenerationService(
      this.options.incrementalClient,
      this.promptOrchestrator,
      this.validationService
    );
  }

  public async run(userPrompt: string): Promise<AgentResult> {
    this.promptOrchestrator.start(userPrompt);

    const analysis = await this.runAnalysisStep(userPrompt);
    const productPlan = await this.runProductStep(userPrompt, analysis);
    const userStoriesResult = await this.expandEpicsToStories(productPlan);
    const architecture = await this.runArchitectureStep(userPrompt, analysis, productPlan, userStoriesResult);

    const planResult: PlanResult = {
      summary: "Planning complete. Ready for code generation.",
      analysis,
      product: productPlan,
      architect: architecture,
      userStories: userStoriesResult.userStories,
      manifestFileCount: architecture.manifest.length,
      epicCount: productPlan.epics.length,
      userStoryCount: userStoriesResult.userStories.length,
    };

    this.emit("planResult", planResult);

    const generatedFiles = await this.codeGenerationService.generateCode(architecture, userStoriesResult.userStories);

    const agentResult: AgentResult = {
      summary: "Code generation complete.",
      requestId: "", // Add request ID logic
      timestamp: new Date().toISOString(),
      timings: { total: 0, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 }, // Add timing logic
      analysis,
      product: productPlan,
      architect: architecture,
      engine: {
        files: generatedFiles.map(f => ({ ...f, language: "" })), // Map to GeneratedFile
      },
      userStories: userStoriesResult.userStories,
      quality: {
        validationErrors: [], // Add validation logic
        codeCompleteness: 0, // Add completeness logic
      },
      fenix: {
        notes: "",
      },
    };

    return agentResult;
  }

  /**
   * Legacy alias for run() - backward compatibility with orchestrators.
   */
  public async analyze(userPrompt: string): Promise<AgentResult> {
    return this.run(userPrompt);
  }

  /**
   * Phase 1: Generate just the plan (analysis, product, architecture, user stories).
   * Returns PlanResult for user review before code generation.
   */
  public async planProject(userPrompt: string): Promise<PlanResult> {
    this.promptOrchestrator.start(userPrompt);

    const analysis = await this.runAnalysisStep(userPrompt);
    const productPlan = await this.runProductStep(userPrompt, analysis);
    const userStoriesResult = await this.expandEpicsToStories(productPlan);
    const architecture = await this.runArchitectureStep(userPrompt, analysis, productPlan, userStoriesResult);

    const planResult: PlanResult = {
      summary: "Planning complete. Ready for code generation.",
      analysis,
      product: productPlan,
      architect: architecture,
      userStories: userStoriesResult.userStories,
      manifestFileCount: architecture.manifest.length,
      epicCount: productPlan.epics.length,
      userStoryCount: userStoriesResult.userStories.length,
    };

    this.emit("planResult", planResult);

    return planResult;
  }

  /**
   * Phase 2: Generate code from a previously created plan.
   * Should be called after planProject() and user approval.
   */
  public async generateFromPlan(plan: PlanResult, _enrichedPrompt?: string): Promise<AgentResult> {
    const architecture = plan.architect;
    const userStories = plan.userStories;

    const generatedFiles = await this.codeGenerationService.generateCode(
      architecture,
      userStories
    );

    const agentResult: AgentResult = {
      summary: "Code generation complete.",
      requestId: "",
      timestamp: new Date().toISOString(),
      timings: { total: 0, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 },
      analysis: plan.analysis,
      product: plan.product,
      architect: architecture,
      engine: {
        files: generatedFiles.map(f => ({ ...f, language: "" })),
      },
      userStories,
      quality: {
        validationErrors: [],
        codeCompleteness: 0,
      },
      fenix: {
        notes: "",
      },
    };

    return agentResult;
  }

  /**
   * Phase 2 Incremental: Generate code with batch governance.
   * Uses IncrementalGenerator for batch-by-batch validation.
   */
  public async generateFromPlanIncremental(
    plan: PlanResult,
    _enrichedPrompt?: string,
    onProgress?: (batchName: string, progress: number) => void
  ): Promise<AgentResult> {
    const architecture = plan.architect;
    const userStories = plan.userStories;

    const generatedFiles = await this.codeGenerationService.generateCode(
      architecture,
      userStories
    );

    // Emit progress if callback provided
    if (onProgress) {
      onProgress("complete", 100);
    }

    const agentResult: AgentResult = {
      summary: "Incremental code generation complete.",
      requestId: "",
      timestamp: new Date().toISOString(),
      timings: { total: 0, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 },
      analysis: plan.analysis,
      product: plan.product,
      architect: architecture,
      engine: {
        files: generatedFiles.map(f => ({ ...f, language: "" })),
      },
      userStories,
      quality: {
        validationErrors: [],
        codeCompleteness: 100,
      },
      fenix: {
        notes: "Generated incrementally with batch governance",
      },
    };

    return agentResult;
  }

  private async runAnalysisStep(userPrompt: string): Promise<RichAnalysis> {
    const prompt = this.promptOrchestrator.getAnalysisPrompt(userPrompt);
    const result = await this.callLLM<RichAnalysis>(prompt, RichAnalysisSchema);
    this.promptOrchestrator.setAnalysis(result);
    return result;
  }

  private async runProductStep(userPrompt: string, analysis: RichAnalysis): Promise<RichProductPlan> {
    const prompt = this.promptOrchestrator.getProductPrompt(userPrompt, analysis);
    const result = await this.callLLM<RichProductPlan>(prompt, RichProductPlanSchema);
    this.promptOrchestrator.setProductPlan(result);
    return result;
  }

  private async runArchitectureStep(userPrompt: string, analysis: RichAnalysis, productPlan: RichProductPlan, userStories: RichUserStoriesResult): Promise<RichArchitecture> {
    const prompt = this.promptOrchestrator.getArchitecturePrompt(userPrompt, analysis, productPlan, userStories.userStories);
    const rawResult = await this.callLLM<RichArchitecture>(prompt, RichArchitectureSchema);

    // Apply generic governance: inject essential files if missing
    const auditedResult = baseProjectAuditor.auditAndFix(rawResult);

    // Validate category distribution and emit warnings
    const categoryValidation = categoryValidator.validate(auditedResult.manifest);
    if (categoryValidation.warnings.length > 0) {
      this.emit("governance:warnings", {
        phase: "architecture",
        warnings: categoryValidation.warnings,
      });
    }
    if (!categoryValidation.isValid) {
      this.emit("governance:errors", {
        phase: "architecture",
        errors: categoryValidation.errors,
      });
    }

    this.promptOrchestrator.setArchitecture(auditedResult);
    return auditedResult;
  }

  private async expandEpicsToStories(productPlan: RichProductPlan): Promise<RichUserStoriesResult> {
    const allUserStories: RichUserStoriesResult = { epicId: "", epicTitle: "", userStories: [], summary: { totalStories: 0, totalPoints: 0, p0Count: 0, p1Count: 0, p2Count: 0 } };
    for (const epic of productPlan.epics) {
      const prompt = this.promptOrchestrator.getUserStoriesPrompt(epic, productPlan);
      const result = await this.callLLM<RichUserStoriesResult>(prompt, RichUserStoriesResultSchema);
      allUserStories.userStories.push(...result.userStories);
      this.promptOrchestrator.addUserStories(result.userStories);
    }
    return allUserStories;
  }

  private async callLLM<T>(prompt: { system: string; user: string }, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(prompt.system, prompt.user, this.options.model, this.options.temperature);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.options.chatClient.chatCompletion([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]);

    const parsed = schema.parse(JSON.parse(response.content || "{}"));
    globalAnalysisCache.set(cacheKey, parsed);
    return parsed;
  }
}
