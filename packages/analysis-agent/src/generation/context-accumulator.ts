import type { LLMGeneratedFile } from "../types/generation-types.js";

export class ContextAccumulator {
  private generatedFiles: LLMGeneratedFile[] = [];

  public addFiles(files: LLMGeneratedFile[]): void {
    this.generatedFiles.push(...files);
  }

  public buildContextForNextBatch(): string {
    if (this.generatedFiles.length === 0) {
      return "This is the first batch. No files have been generated yet.";
    }

    const context = this.generatedFiles.map(f => {
      return `// File: ${f.path}\n${f.content.substring(0, 500)}...`; // Limita o contexto
    }).join("\n\n");

    return `The following files have already been generated:\n\n${context}`;
  }
}
