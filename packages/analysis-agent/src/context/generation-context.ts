/**
 * @fileoverview Contexto de geração que acumula informação entre etapas.
 * 
 * Resolve o problema de fragmentação: cada etapa do pipeline agora tem
 * acesso ao output completo das etapas anteriores.
 * 
 * @module context/generation-context
 * @version 1.0.0
 */

import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichUserStory,
  GeneratedFile
} from "../types/rich-schemas.js";
import {
  ProjectTypeDetectionResult,
  projectTypeDetector,
} from "../planning/project-type-detector.js";

/**
 * Contexto acumulativo de geração.
 * 
 * Cada etapa do pipeline adiciona informação e as etapas seguintes
 * podem acessar o contexto completo para gerar output mais coerente.
 */
export class GenerationContext {
  private _userPrompt: string = "";
  private _analysis: RichAnalysis | null = null;
  private _product: RichProductPlan | null = null;
  private _architecture: RichArchitecture | null = null;
  private _userStories: RichUserStory[] = [];
  private _generatedFiles: GeneratedFile[] = [];
  private _startTime: number = 0;
  private _projectTypeDetection: ProjectTypeDetectionResult | null = null;

  /**
   * Inicia um novo contexto de geração
   */
  start(userPrompt: string): void {
    this._userPrompt = userPrompt;
    this._startTime = performance.now();
    this._analysis = null;
    this._product = null;
    this._architecture = null;
    this._userStories = [];
    this._generatedFiles = [];

    // Detect project type early in the pipeline
    this._projectTypeDetection = projectTypeDetector.detect(userPrompt);

    // eslint-disable-next-line no-console
    console.log(
      `[GenerationContext] Detected project type: ${this._projectTypeDetection.primaryType}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `[GenerationContext] Estimated minimum files: ${this._projectTypeDetection.estimatedMinFiles}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `[GenerationContext] Data structures detected: ${this._projectTypeDetection.dataStructures.length}`
    );
  }

  // --- SETTERS ---

  setAnalysis(analysis: RichAnalysis): void {
    this._analysis = analysis;
  }

  setProduct(product: RichProductPlan): void {
    this._product = product;
  }

  setArchitecture(architecture: RichArchitecture): void {
    this._architecture = architecture;
  }

  addUserStories(stories: RichUserStory[]): void {
    this._userStories.push(...stories);
  }

  addGeneratedFile(file: GeneratedFile): void {
    this._generatedFiles.push(file);
  }

  // --- GETTERS ---

  get userPrompt(): string {
    return this._userPrompt;
  }

  get analysis(): RichAnalysis | null {
    return this._analysis;
  }

  get product(): RichProductPlan | null {
    return this._product;
  }

  get architecture(): RichArchitecture | null {
    return this._architecture;
  }

  get userStories(): RichUserStory[] {
    return this._userStories;
  }

  get generatedFiles(): GeneratedFile[] {
    return this._generatedFiles;
  }

  get elapsedMs(): number {
    return performance.now() - this._startTime;
  }

  get projectTypeDetection(): ProjectTypeDetectionResult | null {
    return this._projectTypeDetection;
  }

  // --- CONTEXT BUILDERS ---

  /**
   * Gera contexto para a etapa de Product (após Analysis)
   */
  buildProductContext(): string {
    if (!this._analysis) {
      return `Pedido Original: ${this._userPrompt}`;
    }

    return `
## ANÁLISE PRÉVIA
- Resumo: ${this._analysis.summary}
- Complexidade: ${this._analysis.complexity.level} (Score: ${this._analysis.complexity.score})
- Justificativa: ${this._analysis.complexity.justification}
- Entidades Core: ${this._analysis.coreEntities.join(", ")}
- Premissas: ${this._analysis.assumptions.join("; ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}

## PEDIDO ORIGINAL
${this._userPrompt}
`.trim();
  }

  /**
   * Gera contexto para a etapa de Architecture (após Product)
   */
  buildArchitectureContext(): string {
    const parts: string[] = [];

    parts.push(`## PEDIDO ORIGINAL\n${this._userPrompt}`);

    // Add project type detection information
    if (this._projectTypeDetection) {
      const detection = this._projectTypeDetection;
      parts.push(`
## DETECÇÃO DE TIPO DE PROJETO

**TIPO:** ${detection.primaryType}

**Estruturas de dados detectadas (${detection.dataStructures.length}):**
${detection.dataStructures.map(ds => {
  let line = `- ${ds.name}: ${ds.minMethods}+ métodos obrigatórios`;
  if (ds.requiredAlgorithms.length > 0) {
    line += ` (algoritmos: ${ds.requiredAlgorithms.join(", ")})`;
  }
  return line;
}).join("\n")}

**Para CADA estrutura, gere os seguintes arquivos:**
- Arquivo DOMAIN com a classe da estrutura (listar TODOS os métodos no purpose)
- Arquivo APPLICATION com os use cases / operações
- Arquivo UI com o componente visualizador
- Arquivo TESTS com os testes unitários

**Requisitos especiais:**
${detection.flags.needsAnimation ? "- Motor de animação (AnimationController, StepBuilder)" : ""}
${detection.flags.needsPseudocode ? "- Painel de pseudocódigo" : ""}
${detection.flags.needsPlaybackControls ? "- Controles de playback (play/pause/step)" : ""}
${detection.flags.needsStepExecution ? "- Execução passo a passo" : ""}
`);
    }

    if (this._analysis) {
      parts.push(`
## ANÁLISE
- Complexidade: ${this._analysis.complexity.level} (${this._analysis.complexity.score}/10)
- Entidades: ${this._analysis.coreEntities.join(", ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}
`);
    }

    if (this._product) {
      const epicCount = this._product.epics.length;
      const epicsDetailed = this._product.epics
        .map(e => {
          const reqs = e.requirements.length > 0 ? `\n  Requisitos: ${e.requirements.join("; ")}` : "";
          return `- [${e.id}] ${e.title} (${e.category}, ${e.priority}, ${e.estimatedComplexity})${reqs}`;
        })
        .join("\n");

      parts.push(`
## PRODUTO
Visão: ${this._product.productVision}

### Épicos (${epicCount} total):
${epicsDetailed}

### Fora de Escopo:
${this._product.outOfScope.join(", ")}

### Riscos:
${this._product.risks.map(r => `- ${r.description} → ${r.mitigation}`).join("\n")}
`);
    }

    return parts.join("\n\n").trim();
  }

  /**
   * Gera contexto para geração de código de um arquivo específico.
   * 
   * MELHORIAS (Causa Raiz #4 - Falta de Context Awareness):
   * - Inclui User Stories relacionadas ao arquivo
   * - Fornece requisitos funcionais específicos
   * - Cita exemplos de uso esperado
   * - Mapeia dependências de código
   */
  buildCodeGenContext(filePath: string): string {
    const parts: string[] = [];

    // Stack e estilo arquitetural
    if (this._architecture) {
      const stack = this._architecture.stack;
      parts.push(`
## STACK TECNOLÓGICA
- Runtime: ${stack.runtime}
- Linguagem: ${stack.language}
- Framework: ${stack.framework}
- ORM: ${stack.orm}
- Database: ${stack.database}
- Testing: ${stack.testing}

## ESTILO ARQUITETURAL
${this._architecture.architectureStyle}

## DECISÕES CHAVE
${this._architecture.keyDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join("\n")}
`);
    }

    // Arquivos já gerados (para imports válidos)
    if (this._generatedFiles.length > 0) {
      const fileList = this._generatedFiles
        .map(f => `- ${f.path}`)
        .join("\n");
      
      parts.push(`
## ARQUIVOS JÁ GERADOS (use para imports)
${fileList}
`);
    }

    // Informação do arquivo específico no manifest
    let manifestItem;
    if (this._architecture) {
      manifestItem = this._architecture.manifest.find(m => m.path === filePath);
      if (manifestItem) {
        parts.push(`
## ARQUIVO A GERAR
- Path: ${manifestItem.path}
- Propósito: ${manifestItem.purpose}
- Criticidade: ${manifestItem.criticality}
- Categoria: ${manifestItem.category}
`);
      }
    }

    // NOVO: Incluir User Stories relacionadas ao arquivo (Causa Raiz #4)
    if (this._userStories.length > 0 && manifestItem) {
      // Estratégia de mapeamento: User Stories que mencionam o arquivo ou sua categoria
      const relatedStories = this._userStories.filter(us => {
        // Mapear por categoria ou por palavras-chave no path
        const titleLower = us.title.toLowerCase();
        const descLower = us.description.toLowerCase();
        
        // Critério 1: Categoria do arquivo mencionada na HU
        if (titleLower.includes(manifestItem.category.toLowerCase()) || 
            descLower.includes(manifestItem.category.toLowerCase())) {
          return true;
        }
        
        // Critério 2: Nome do arquivo ou componente mencionado na HU
        const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() || '';
        if (fileName && (titleLower.includes(fileName) || descLower.includes(fileName))) {
          return true;
        }
        
        // Critério 3: Palavras-chave do propósito mencionadas na HU
        const purposeKeywords = manifestItem.purpose.toLowerCase().split(/\s+/);
        if (purposeKeywords.some((kw: string) => kw.length > 3 && (titleLower.includes(kw) || descLower.includes(kw)))) {
          return true;
        }
        
        return false;
      });

      if (relatedStories.length > 0) {
        const storiesText = relatedStories
          .map(us => `- [${us.id}] ${us.title}\n  Descrição: ${us.description}\n  Pontos: ${us.estimatedPoints} | Prioridade: ${us.priority}`)
          .join("\n\n");
        
        parts.push(`
## USER STORIES RELACIONADAS (Requisitos Funcionais)
O código deste arquivo deve atender aos seguintes requisitos:

${storiesText}
`);
      }
    }

    // Contexto do prompt original (resumido)
    if (this._analysis) {
      parts.push(`
## CONTEXTO DO PROJETO
${this._analysis.summary}
`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Gera contexto para expansão de épico em User Stories
   */
  buildUserStoriesContext(epicId: string): string {
    const parts: string[] = [];

    if (this._product) {
      const epic = this._product.epics.find(e => e.id === epicId);
      if (epic) {
        parts.push(`
## ÉPICO A EXPANDIR
- ID: ${epic.id}
- Título: ${epic.title}
- Categoria: ${epic.category}
- Contexto: ${epic.context}
- Prioridade: ${epic.priority}
- Complexidade Estimada: ${epic.estimatedComplexity}

### Requisitos:
${epic.requirements.map(r => `- ${r}`).join("\n")}

### Critérios de Aceite do Épico:
${epic.acceptanceCriteria.map(ac => `- ${ac}`).join("\n")}
`);
      }
    }

    // Adiciona contexto da análise para entender o domínio
    if (this._analysis) {
      parts.push(`
## CONTEXTO DO DOMÍNIO
- Entidades Core: ${this._analysis.coreEntities.join(", ")}
- Complexidade do Projeto: ${this._analysis.complexity.level}
`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Serializa o contexto atual para debug/logs
   */
  toDebugString(): string {
    return JSON.stringify({
      userPrompt: this._userPrompt.substring(0, 100) + "...",
      hasAnalysis: !!this._analysis,
      hasProduct: !!this._product,
      hasArchitecture: !!this._architecture,
      userStoriesCount: this._userStories.length,
      generatedFilesCount: this._generatedFiles.length,
      elapsedMs: this.elapsedMs
    }, null, 2);
  }
}

/**
 * Singleton para uso global no Agent
 */
export const globalGenerationContext = new GenerationContext();
