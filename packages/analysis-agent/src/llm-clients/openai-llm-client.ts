/**
 * @fileoverview OpenAI LLM Client for Incremental Code Generation
 *
 * Implements the IIncrementalLLMClient interface for use with IncrementalGenerator.
 * Uses OpenAI's API to generate code batch by batch with streaming support.
 */

import OpenAI from "openai";
import { IIncrementalLLMClient } from "./llm-client.interface.js";
import type { BatchGeneratedFile } from "../types/generation-types.js";
import { createHash } from "node:crypto";

/**
 * Legacy LLM Client interface for backward compatibility
 */
export interface LegacyLLMClient {
  generateCode(prompt: string, context: string, domainExamples?: string): Promise<BatchGeneratedFile[]>;
}

/**
 * File specification extracted from batch prompt
 */
interface FileSpec {
  path: string;
  purpose: string;
  category: string;
  criticality: string;
}

/**
 * OpenAI-based LLM client for incremental code generation.
 *
 * Features:
 * - Streaming support for real-time code generation
 * - Structured JSON output for reliable file extraction
 * - Retry logic with temperature variation
 * - Context-aware prompts including previously generated files
 */
export class OpenAILLMClient implements IIncrementalLLMClient, LegacyLLMClient {
  private openai: OpenAI;
  private defaultModel: string;
  private maxRetries: number;

  constructor(apiKey: string, options?: { baseUrl?: string; model?: string; maxRetries?: number; timeout?: number }) {
    const clientOptions: { apiKey: string; timeout: number; baseURL?: string } = {
      apiKey,
      timeout: options?.timeout ?? 600000 // 10 minutes timeout (large prompts can take time)
    };

    if (options?.baseUrl) {
      clientOptions.baseURL = options.baseUrl;
    }

    this.openai = new OpenAI(clientOptions);
    this.defaultModel = options?.model || "gpt-4o-mini";
    this.maxRetries = options?.maxRetries ?? 3;
  }

  /**
   * Incremental completion with streaming support.
   * Implements IIncrementalLLMClient interface.
   */
  async *incrementalCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string; }[],
    options?: {
      model?: string;
      temperature?: number;
      seed?: number;
      response_format?: { type: "json_object" | "text" };
    }
  ): AsyncIterable<{ content: string; }> {
    const response = await this.openai.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature,
      seed: options?.seed,
      response_format: options?.response_format,
      stream: true, // Important for incremental generation
    });

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        yield { content };
      }
    }
  }

  /**
   * Legacy generateCode method for backward compatibility.
   * Implements LLMClient interface from incremental-generator.
   */
  async generateCode(
    prompt: string,
    context: string,
    domainExamples?: string
  ): Promise<BatchGeneratedFile[]> {
    const fileSpecs = this.extractFileSpecs(prompt);

    if (fileSpecs.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[OpenAILLMClient] No file specs found in prompt");
      return [];
    }

    const systemPrompt = this.buildSystemPrompt(domainExamples);
    const userPrompt = this.buildUserPrompt(prompt, context, fileSpecs);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Dynamic temperature: start deterministic, increase on retries
        const temperature = attempt === 1 ? 0.0 : 0.3 + (attempt - 1) * 0.2;

        const response = await this.openai.chat.completions.create({
          model: this.defaultModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature,
          seed: attempt === 1 ? 42 : undefined,
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from OpenAI");
        }

        const parsed = JSON.parse(content);
        const files = this.parseGeneratedFiles(parsed, fileSpecs);

        // Validate we got all files
        if (files.length < fileSpecs.length) {
          const missing = fileSpecs
            .filter((spec) => !files.some((f) => f.path === spec.path))
            .map((s) => s.path);
          throw new Error(`Missing files in response: ${missing.join(", ")}`);
        }

        // eslint-disable-next-line no-console
        console.log(
          `[OpenAILLMClient] Generated ${files.length} files (attempt ${attempt})`
        );
        return files;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // eslint-disable-next-line no-console
        console.warn(
          `[OpenAILLMClient] Attempt ${attempt}/${this.maxRetries} failed:`,
          lastError.message
        );

        if (attempt < this.maxRetries) {
          // Wait before retry (exponential backoff)
          await this.sleep(1000 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError ?? new Error("Unknown error during code generation");
  }

  /**
   * Builds the system prompt for code generation
   */
  private buildSystemPrompt(domainExamples?: string): string {
    const basePrompt = `You are an expert code generator. You generate COMPLETE, WORKING, PRODUCTION-READY code.

CRITICAL RULES:
1. Generate FULL implementations - NO placeholders, NO "TODO", NO "..."
2. Include ALL necessary imports at the top of each file
3. Follow TypeScript best practices with proper typing
4. Add JSDoc comments for all exported functions, classes, and interfaces
5. Handle edge cases and errors appropriately
6. For data structures: implement ALL methods completely

OUTPUT FORMAT:
You MUST respond with a JSON object containing a "files" array:
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "// Full file content here..."
    }
  ]
}

IMPORTANT:
- Generate ALL requested files
- Each file must have complete, working code
- Do not skip any file
- Content must be valid for the file type`;

    if (domainExamples && domainExamples.trim().length > 0) {
      return `${basePrompt}

# REFERENCE CODE EXAMPLES
The following examples demonstrate patterns and conventions for this type of project.
Use them as reference for style, structure, and implementation patterns.

${domainExamples}`;
    }

    return basePrompt;
  }

  /**
   * Builds the user prompt with context
   */
  private buildUserPrompt(
    batchPrompt: string,
    context: string,
    fileSpecs: FileSpec[]
  ): string {
    const lines: string[] = [];

    lines.push("# Code Generation Request");
    lines.push("");
    lines.push("## Files to Generate");
    lines.push("");

    for (const spec of fileSpecs) {
      lines.push(`### ${spec.path}`);
      lines.push(`- Purpose: ${spec.purpose}`);
      lines.push(`- Category: ${spec.category}`);
      lines.push(`- Criticality: ${spec.criticality}`);
      lines.push("");
    }

    if (context && context.trim().length > 0) {
      lines.push("## Context (Previously Generated Files)");
      lines.push(context);
      lines.push("");
    }

    lines.push("## Batch Information");
    lines.push(batchPrompt);
    lines.push("");

    lines.push("## Response Format");
    lines.push('Respond with JSON containing a "files" array with path and content for each file.');

    return lines.join("\n");
  }

  /**
   * Extracts file specifications from the batch prompt
   */
  private extractFileSpecs(prompt: string): FileSpec[] {
    const specs: FileSpec[] = [];
    const lines = prompt.split("\n");

    let currentFile: Partial<FileSpec> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Match file path header (### src/path/to/file.ts)
      const pathMatch = trimmed.match(/^###\s+(.+\.\w+)$/);
      if (pathMatch) {
        if (currentFile?.path) {
          specs.push(this.completeFileSpec(currentFile));
        }
        currentFile = { path: pathMatch[1] };
        continue;
      }

      if (currentFile) {
        // Match purpose
        const purposeMatch = trimmed.match(/^-\s*Purpose:\s*(.+)$/i);
        if (purposeMatch) {
          currentFile.purpose = purposeMatch[1];
          continue;
        }

        // Match category
        const categoryMatch = trimmed.match(/^-\s*Category:\s*(.+)$/i);
        if (categoryMatch) {
          currentFile.category = categoryMatch[1];
          continue;
        }

        // Match criticality
        const criticalityMatch = trimmed.match(/^-\s*Criticality:\s*(.+)$/i);
        if (criticalityMatch) {
          currentFile.criticality = criticalityMatch[1];
          continue;
        }
      }
    }

    // Don't forget the last file
    if (currentFile?.path) {
      specs.push(this.completeFileSpec(currentFile));
    }

    return specs;
  }

  /**
   * Completes a partial file spec with defaults
   */
  private completeFileSpec(partial: Partial<FileSpec>): FileSpec {
    return {
      path: partial.path ?? "unknown.ts",
      purpose: partial.purpose ?? "Implementation",
      category: partial.category ?? "APPLICATION",
      criticality: partial.criticality ?? "MEDIUM",
    };
  }

  /**
   * Parses the generated files from the LLM response
   */
  private parseGeneratedFiles(
    response: unknown,
    expectedSpecs: FileSpec[]
  ): BatchGeneratedFile[] {
    const files: BatchGeneratedFile[] = [];

    if (!response || typeof response !== "object") {
      throw new Error("Invalid response format: expected object");
    }

    const responseObj = response as Record<string, unknown>;
    const filesArray = responseObj["files"];

    if (!Array.isArray(filesArray)) {
      throw new Error('Invalid response format: missing "files" array');
    }

    for (const file of filesArray) {
      if (!file || typeof file !== "object") {
        continue;
      }

      const fileObj = file as Record<string, unknown>;
      const path = fileObj["path"];
      const content = fileObj["content"];

      if (typeof path !== "string" || typeof content !== "string") {
        continue;
      }

      // Normalize path (remove leading ./ if present)
      const normalizedPath = path.replace(/^\.\//, "");

      // Verify this is an expected file
      const isExpected = expectedSpecs.some(
        (spec) =>
          spec.path === normalizedPath ||
          spec.path === path ||
          spec.path.endsWith(normalizedPath) ||
          normalizedPath.endsWith(spec.path)
      );

      if (!isExpected) {
        // eslint-disable-next-line no-console
        console.warn(`[OpenAILLMClient] Unexpected file in response: ${path}`);
      }

      files.push({
        path: normalizedPath,
        content,
        hash: this.computeHash(content),
      });
    }

    return files;
  }

  /**
   * Computes SHA-256 hash of content
   */
  private computeHash(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16);
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
