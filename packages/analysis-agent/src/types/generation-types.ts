import type { RichManifestItem } from "./rich-schemas.js";

// Representa um ficheiro dentro de um lote a ser gerado
export interface BatchFile extends RichManifestItem {}

// A estrutura que o LLM deve retornar para um único ficheiro
export interface LLMGeneratedFile {
  path: string;
  content: string;
  reasoning: string;
  language: string;
}

// O objeto JSON completo que o LLM deve retornar
export interface LLMCodeGenerationResult {
  files: LLMGeneratedFile[];
}

// O resultado da geração de um lote de ficheiros
export interface BatchResult {
  generatedFiles: LLMGeneratedFile[];
  errors: string[];
  warnings: string[];
}

// Para compatibilidade com o que já existe
export interface BatchGeneratedFile {
  path: string;
  content: string;
}
