/**
 * @fileoverview Incremental Code Generator with Governance
 *
 * Implements a pipeline-based approach for generating large codebases:
 * 1. Divides manifest into logical batches
 * 2. Generates code batch by batch
 * 3. Validates each batch before proceeding
 * 4. Maintains context across batches
 * 5. Fails fast if any batch is invalid
 *
 * Based on industry practices:
 * - Trunk-Based Development (atomic, validated commits)
 * - CI/CD Pipelines (validation at each stage)
 * - Event Sourcing (complete history of decisions)
 * - Contract-First (manifest is the contract)
 */

import type { RichManifestItem, RichArchitecture } from "../types/rich-schemas.js";

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationBatch {
  id: string;
  name: string;
  description: string;
  files: RichManifestItem[];
  dependencies: string[]; // IDs of batches that must complete first
  priority: number; // Lower = earlier
}

export interface BatchResult {
  batchId: string;
  success: boolean;
  filesGenerated: BatchGeneratedFile[];
  errors: string[];
  validationPassed: boolean;
  durationMs: number;
}

export interface BatchGeneratedFile {
  path: string;
  content: string;
  hash: string;
}

export interface GenerationContext {
  /** Previously generated files (for context in subsequent batches) */
  generatedFiles: Map<string, BatchGeneratedFile>;
  /** The full architecture for reference */
  architecture: RichArchitecture;
  /** User stories for context */
  userStories: unknown[];
  /** Original user prompt */
  userPrompt: string;
  /** Accumulated errors */
  errors: string[];
}

export interface IncrementalGenerationResult {
  success: boolean;
  totalFiles: number;
  generatedFiles: number;
  batches: BatchResult[];
  allFiles: BatchGeneratedFile[];
  errors: string[];
  durationMs: number;
}

// ============================================================================
// MANIFEST BATCHER
// ============================================================================

/**
 * Divides a manifest into logical batches for incremental generation.
 *
 * Batching strategy:
 * 1. Config files first (foundation)
 * 2. Core app files (entry points)
 * 3. Shared types and utils
 * 4. Domain layer (data structures)
 * 5. Application layer (operations, components)
 * 6. Tests
 * 7. Documentation
 */
export class ManifestBatcher {
  private readonly MAX_FILES_PER_BATCH = 15;

  /**
   * Divides manifest into ordered batches
   */
  public createBatches(manifest: RichManifestItem[]): GenerationBatch[] {
    const batches: GenerationBatch[] = [];

    // 1. Config batch (always first)
    const configFiles = manifest.filter(f =>
      f.category === "CONFIG" || f.category === "DEVOPS"
    );
    if (configFiles.length > 0) {
      batches.push({
        id: "batch-config",
        name: "Configuration",
        description: "Config files, package.json, tsconfig, CI/CD",
        files: configFiles,
        dependencies: [],
        priority: 1
      });
    }

    // 2. Core app files
    const coreFiles = manifest.filter(f =>
      f.category === "APPLICATION" &&
      (f.path.includes("main.") || f.path.includes("App.") ||
       f.path.includes("routes") || f.path.includes("styles/"))
    );
    if (coreFiles.length > 0) {
      batches.push({
        id: "batch-core",
        name: "Core Application",
        description: "Entry points, routing, global styles",
        files: coreFiles,
        dependencies: ["batch-config"],
        priority: 2
      });
    }

    // 3. Types and Utils
    const typesUtils = manifest.filter(f =>
      f.path.includes("/types/") || f.path.includes("/utils/")
    );
    if (typesUtils.length > 0) {
      batches.push({
        id: "batch-types-utils",
        name: "Types & Utilities",
        description: "Shared types and utility functions",
        files: typesUtils,
        dependencies: ["batch-config"],
        priority: 3
      });
    }

    // 4. Layout and common components
    const layoutCommon = manifest.filter(f =>
      f.path.includes("/components/layout/") ||
      f.path.includes("/components/common/")
    );
    if (layoutCommon.length > 0) {
      batches.push({
        id: "batch-layout-common",
        name: "Layout & Common Components",
        description: "Reusable UI components",
        files: layoutCommon,
        dependencies: ["batch-types-utils"],
        priority: 4
      });
    }

    // 5. Animation engine (if present)
    const animationFiles = manifest.filter(f =>
      f.path.includes("/animation/") || f.category === "ANIMATION"
    );
    if (animationFiles.length > 0) {
      batches.push({
        id: "batch-animation",
        name: "Animation Engine",
        description: "Animation controller, step builder, frame system",
        files: animationFiles,
        dependencies: ["batch-types-utils"],
        priority: 5
      });
    }

    // 6. Store (if present)
    const storeFiles = manifest.filter(f =>
      f.path.includes("/store/") || f.category === "STORE"
    );
    if (storeFiles.length > 0) {
      batches.push({
        id: "batch-store",
        name: "State Management",
        description: "Store, hooks, state types",
        files: storeFiles,
        dependencies: ["batch-types-utils"],
        priority: 6
      });
    }

    // 7. Simulator components (if present)
    const simulatorFiles = manifest.filter(f =>
      f.path.includes("/components/simulator/")
    );
    if (simulatorFiles.length > 0) {
      batches.push({
        id: "batch-simulator",
        name: "Simulator Components",
        description: "Control panels, timeline, pseudocode display",
        files: simulatorFiles,
        dependencies: ["batch-layout-common", "batch-animation"],
        priority: 7
      });
    }

    // 8. Operation framework
    const opFramework = manifest.filter(f =>
      f.path.includes("/application/operations/") &&
      !this.isDataStructureSpecific(f.path)
    );
    if (opFramework.length > 0) {
      batches.push({
        id: "batch-op-framework",
        name: "Operation Framework",
        description: "Operation registry, executor, validators",
        files: opFramework,
        dependencies: ["batch-types-utils"],
        priority: 8
      });
    }

    // 9. Data structures - one batch per structure
    const dataStructures = this.extractDataStructures(manifest);
    let priority = 10;
    for (const [structureName, files] of dataStructures) {
      const batchId = `batch-ds-${structureName.toLowerCase().replace(/\s+/g, "-")}`;
      batches.push({
        id: batchId,
        name: `Data Structure: ${structureName}`,
        description: `Implementation, types, frames, operations for ${structureName}`,
        files: files,
        dependencies: ["batch-op-framework", "batch-animation"],
        priority: priority++
      });
    }

    // 10. Pages
    const pages = manifest.filter(f => f.path.includes("/pages/"));
    if (pages.length > 0) {
      const dsBatchIds = Array.from(dataStructures.keys()).map(
        name => `batch-ds-${name.toLowerCase().replace(/\s+/g, "-")}`
      );
      batches.push({
        id: "batch-pages",
        name: "Pages",
        description: "Route pages for each structure",
        files: pages,
        dependencies: [...dsBatchIds, "batch-simulator"],
        priority: 100
      });
    }

    // 11. Tests
    const tests = manifest.filter(f => f.category === "TESTS");
    if (tests.length > 0) {
      batches.push({
        id: "batch-tests",
        name: "Tests",
        description: "Unit tests, integration tests",
        files: tests,
        dependencies: ["batch-pages"],
        priority: 200
      });
    }

    // 12. Documentation
    const docs = manifest.filter(f => f.category === "DOCS");
    if (docs.length > 0) {
      batches.push({
        id: "batch-docs",
        name: "Documentation",
        description: "README, architecture docs, guides",
        files: docs,
        dependencies: [],
        priority: 300
      });
    }

    // Sort by priority
    batches.sort((a, b) => a.priority - b.priority);

    // Split large batches
    return this.splitLargeBatches(batches);
  }

  private isDataStructureSpecific(path: string): boolean {
    const dsPatterns = [
      "/array/", "/singly/", "/doubly/", "/tree/", "/graph/",
      "/stack/", "/queue/", "/heap/", "/avl/", "/hash/"
    ];
    return dsPatterns.some(p => path.toLowerCase().includes(p));
  }

  private extractDataStructures(manifest: RichManifestItem[]): Map<string, RichManifestItem[]> {
    const structures = new Map<string, RichManifestItem[]>();

    // Find all data structure related files
    const dsFiles = manifest.filter(f =>
      f.path.includes("/data-structures/") ||
      (f.path.includes("/operations/") && this.isDataStructureSpecific(f.path)) ||
      (f.path.includes("/visualizers/") && this.isDataStructureSpecific(f.path))
    );

    // Group by structure
    for (const file of dsFiles) {
      const structureName = this.extractStructureName(file.path);
      if (structureName) {
        if (!structures.has(structureName)) {
          structures.set(structureName, []);
        }
        structures.get(structureName)!.push(file);
      }
    }

    return structures;
  }

  private extractStructureName(path: string): string | null {
    const patterns = [
      { pattern: /\/array\//i, name: "Array" },
      { pattern: /\/singly/i, name: "SinglyLinkedList" },
      { pattern: /\/doubly/i, name: "DoublyLinkedList" },
      { pattern: /\/tree\//i, name: "BinarySearchTree" },
      { pattern: /\/graph\//i, name: "Graph" },
      { pattern: /\/stack\//i, name: "Stack" },
      { pattern: /\/queue\//i, name: "Queue" },
      { pattern: /\/heap\//i, name: "Heap" },
      { pattern: /\/avl/i, name: "AVLTree" },
      { pattern: /\/hash/i, name: "HashTable" },
    ];

    for (const { pattern, name } of patterns) {
      if (pattern.test(path)) {
        return name;
      }
    }
    return null;
  }

  private splitLargeBatches(batches: GenerationBatch[]): GenerationBatch[] {
    const result: GenerationBatch[] = [];

    for (const batch of batches) {
      if (batch.files.length <= this.MAX_FILES_PER_BATCH) {
        result.push(batch);
      } else {
        // Split into smaller batches
        const chunks = this.chunkArray(batch.files, this.MAX_FILES_PER_BATCH);
        chunks.forEach((chunk, index) => {
          result.push({
            ...batch,
            id: `${batch.id}-part${index + 1}`,
            name: `${batch.name} (Part ${index + 1}/${chunks.length})`,
            files: chunk,
            dependencies: index === 0 ? batch.dependencies : [`${batch.id}-part${index}`]
          });
        });
      }
    }

    return result;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// BATCH VALIDATOR
// ============================================================================

export class BatchValidator {
  /**
   * Validates a batch result before proceeding to the next batch
   */
  public validate(batch: GenerationBatch, result: BatchResult, context: GenerationContext): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 1. Check all files were generated
    const expectedPaths = new Set(batch.files.map(f => f.path));
    const generatedPaths = new Set(result.filesGenerated.map(f => f.path));

    for (const expected of expectedPaths) {
      if (!generatedPaths.has(expected)) {
        errors.push(`Missing file: ${expected}`);
      }
    }

    // 2. Check no empty files
    for (const file of result.filesGenerated) {
      if (!file.content || file.content.trim().length < 10) {
        errors.push(`Empty or minimal file: ${file.path}`);
      }
    }

    // 3. Check TypeScript syntax (basic check)
    for (const file of result.filesGenerated) {
      if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
        const syntaxErrors = this.checkBasicTypescriptSyntax(file.content);
        if (syntaxErrors.length > 0) {
          errors.push(`Syntax errors in ${file.path}: ${syntaxErrors.join(", ")}`);
        }
      }
    }

    // 4. Check imports reference existing files or known packages
    for (const file of result.filesGenerated) {
      if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
        const importErrors = this.checkImports(file, context, result.filesGenerated);
        errors.push(...importErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private checkBasicTypescriptSyntax(content: string): string[] {
    const errors: string[] = [];

    // Check balanced braces
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }

    // Check balanced parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
    }

    // Check for common syntax errors
    if (/export\s+default\s+export/.test(content)) {
      errors.push("Double export detected");
    }

    return errors;
  }

  private checkImports(
    file: BatchGeneratedFile,
    context: GenerationContext,
    batchFiles: BatchGeneratedFile[]
  ): string[] {
    const errors: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];

      // Skip external packages
      if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
        continue;
      }

      // Resolve relative path
      const resolvedPath = this.resolveImportPath(file.path, importPath);

      // Check if file exists in context or current batch
      const existsInContext = context.generatedFiles.has(resolvedPath);
      const existsInBatch = batchFiles.some(f =>
        f.path === resolvedPath ||
        f.path === resolvedPath + ".ts" ||
        f.path === resolvedPath + ".tsx"
      );

      if (!existsInContext && !existsInBatch) {
        // Not an error if it's a planned file in the manifest
        const existsInManifest = context.architecture.manifest.some(m =>
          m.path === resolvedPath ||
          m.path === resolvedPath + ".ts" ||
          m.path === resolvedPath + ".tsx"
        );

        if (!existsInManifest) {
          errors.push(`Import not found in ${file.path}: ${importPath}`);
        }
      }
    }

    return errors;
  }

  private resolveImportPath(filePath: string, importPath: string): string {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    const parts = importPath.split("/");
    const dirParts = dir.split("/");

    for (const part of parts) {
      if (part === "..") {
        dirParts.pop();
      } else if (part !== ".") {
        dirParts.push(part);
      }
    }

    return dirParts.join("/");
  }
}

// ============================================================================
// CONTEXT ACCUMULATOR
// ============================================================================

export class ContextAccumulator {
  private context: GenerationContext;

  constructor(
    architecture: RichArchitecture,
    userStories: unknown[],
    userPrompt: string
  ) {
    this.context = {
      generatedFiles: new Map(),
      architecture,
      userStories,
      userPrompt,
      errors: []
    };
  }

  /**
   * Adds generated files to the context
   */
  public addBatchResult(result: BatchResult): void {
    for (const file of result.filesGenerated) {
      this.context.generatedFiles.set(file.path, file);
    }

    if (!result.success) {
      this.context.errors.push(...result.errors);
    }
  }

  /**
   * Gets context for the next batch generation.
   * Includes summaries of previously generated files.
   */
  public getContextForBatch(batch: GenerationBatch): string {
    const lines: string[] = [];

    lines.push("## Previously Generated Files (for reference)");
    lines.push("");

    // Include file paths and key exports
    for (const [path, file] of this.context.generatedFiles) {
      const exports = this.extractExports(file.content);
      if (exports.length > 0) {
        lines.push(`- ${path}: exports ${exports.join(", ")}`);
      } else {
        lines.push(`- ${path}`);
      }
    }

    lines.push("");
    lines.push("## Files to Generate in This Batch");
    lines.push("");

    for (const file of batch.files) {
      lines.push(`- ${file.path}: ${file.purpose}`);
    }

    return lines.join("\n");
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Named exports
    const namedExportRegex = /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    // Default export
    if (/export\s+default/.test(content)) {
      exports.push("default");
    }

    return exports.slice(0, 5); // Limit to avoid too much context
  }

  public getContext(): GenerationContext {
    return this.context;
  }

  public getProgress(): { generated: number; total: number; percentage: number } {
    const generated = this.context.generatedFiles.size;
    const total = this.context.architecture.manifest.length;
    return {
      generated,
      total,
      percentage: Math.round((generated / total) * 100)
    };
  }
}

// ============================================================================
// INCREMENTAL GENERATOR
// ============================================================================

export interface LLMClient {
  generateCode(prompt: string, context: string): Promise<BatchGeneratedFile[]>;
}

export class IncrementalGenerator {
  private readonly batcher = new ManifestBatcher();
  private readonly validator = new BatchValidator();

  constructor(private readonly llmClient: LLMClient) {}

  /**
   * Generates code incrementally from a manifest.
   *
   * @param architecture - The complete architecture with manifest
   * @param userStories - User stories for context
   * @param userPrompt - Original user prompt
   * @param onProgress - Callback for progress updates
   * @returns Generation result with all files
   */
  public async generate(
    architecture: RichArchitecture,
    userStories: unknown[],
    userPrompt: string,
    onProgress?: (batch: string, progress: number) => void
  ): Promise<IncrementalGenerationResult> {
    const startTime = Date.now();
    const batches = this.batcher.createBatches(architecture.manifest);
    const accumulator = new ContextAccumulator(architecture, userStories, userPrompt);

    const batchResults: BatchResult[] = [];
    const allFiles: BatchGeneratedFile[] = [];
    const errors: string[] = [];

    // eslint-disable-next-line no-console
    console.log(`[IncrementalGenerator] Starting generation: ${batches.length} batches, ${architecture.manifest.length} total files`);

    for (const batch of batches) {
      // eslint-disable-next-line no-console
      console.log(`[IncrementalGenerator] Processing batch: ${batch.name} (${batch.files.length} files)`);

      // Report progress
      const progress = accumulator.getProgress();
      onProgress?.(batch.name, progress.percentage);

      // Generate this batch
      const batchStart = Date.now();
      const result = await this.generateBatch(batch, accumulator);
      result.durationMs = Date.now() - batchStart;

      // Validate the batch
      const validation = this.validator.validate(batch, result, accumulator.getContext());
      result.validationPassed = validation.valid;

      if (!validation.valid) {
        // eslint-disable-next-line no-console
        console.error(`[IncrementalGenerator] Batch ${batch.name} validation failed:`, validation.errors);
        result.errors.push(...validation.errors);

        // FAIL FAST: If batch validation fails, stop and return error
        errors.push(`Batch "${batch.name}" failed validation: ${validation.errors.join("; ")}`);
        batchResults.push(result);

        return {
          success: false,
          totalFiles: architecture.manifest.length,
          generatedFiles: allFiles.length,
          batches: batchResults,
          allFiles,
          errors,
          durationMs: Date.now() - startTime
        };
      }

      // Add to accumulator and results
      accumulator.addBatchResult(result);
      batchResults.push(result);
      allFiles.push(...result.filesGenerated);

      // eslint-disable-next-line no-console
      console.log(`[IncrementalGenerator] Batch ${batch.name} completed: ${result.filesGenerated.length} files`);
    }

    // Final validation
    const finalProgress = accumulator.getProgress();
    if (finalProgress.generated < finalProgress.total) {
      errors.push(`Incomplete generation: ${finalProgress.generated}/${finalProgress.total} files (${finalProgress.percentage}%)`);
    }

    return {
      success: errors.length === 0,
      totalFiles: architecture.manifest.length,
      generatedFiles: allFiles.length,
      batches: batchResults,
      allFiles,
      errors,
      durationMs: Date.now() - startTime
    };
  }

  private async generateBatch(
    batch: GenerationBatch,
    accumulator: ContextAccumulator
  ): Promise<BatchResult> {
    const context = accumulator.getContextForBatch(batch);

    const prompt = this.buildBatchPrompt(batch, accumulator.getContext());

    try {
      const files = await this.llmClient.generateCode(prompt, context);

      return {
        batchId: batch.id,
        success: true,
        filesGenerated: files,
        errors: [],
        validationPassed: false, // Will be set by validator
        durationMs: 0
      };
    } catch (error) {
      return {
        batchId: batch.id,
        success: false,
        filesGenerated: [],
        errors: [error instanceof Error ? error.message : String(error)],
        validationPassed: false,
        durationMs: 0
      };
    }
  }

  private buildBatchPrompt(batch: GenerationBatch, context: GenerationContext): string {
    const lines: string[] = [];

    lines.push(`# Code Generation Batch: ${batch.name}`);
    lines.push("");
    lines.push(`## Description`);
    lines.push(batch.description);
    lines.push("");
    lines.push(`## Files to Generate (${batch.files.length} files)`);
    lines.push("");

    for (const file of batch.files) {
      lines.push(`### ${file.path}`);
      lines.push(`- Purpose: ${file.purpose}`);
      lines.push(`- Category: ${file.category}`);
      lines.push(`- Criticality: ${file.criticality}`);
      lines.push("");
    }

    lines.push(`## Architecture Context`);
    lines.push(`- Style: ${context.architecture.architectureStyle}`);
    lines.push(`- Stack: ${JSON.stringify(context.architecture.stack)}`);
    lines.push("");

    lines.push(`## Requirements`);
    lines.push(`1. Generate COMPLETE, WORKING code for each file`);
    lines.push(`2. Follow TypeScript best practices`);
    lines.push(`3. Include all imports (reference previously generated files)`);
    lines.push(`4. Match the purpose description exactly`);
    lines.push(`5. For data structures: implement ALL methods listed in purpose`);
    lines.push("");

    return lines.join("\n");
  }
}

