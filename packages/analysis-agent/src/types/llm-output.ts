export interface LLMGeneratedFile {
  path: string;
  content: string;
}

export interface LLMCodeGenerationResult {
  files: LLMGeneratedFile[];
}
