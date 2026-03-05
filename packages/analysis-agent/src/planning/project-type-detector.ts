/**
 * @fileoverview Project Type Detector - Identifies project type and calculates expected file counts
 *
 * This module analyzes user prompts to detect project types and calculate minimum
 * expected file counts based on the project complexity and requirements.
 *
 * Supported project types:
 * - VISUALIZATION: Data structure/algorithm visualization applications
 * - EDUCATIONAL: Interactive learning platforms with animations
 * - CRUD: Traditional CRUD applications
 * - API: Backend API services
 * - FULLSTACK: Full-stack applications
 *
 * @module planning/project-type-detector
 * @version 1.0.0
 */

/**
 * Supported project types
 */
export type ProjectType =
  | "VISUALIZATION"
  | "EDUCATIONAL"
  | "CRUD"
  | "API"
  | "FULLSTACK"
  | "LIBRARY"
  | "GENERIC";

/**
 * Detected data structure from prompt analysis
 */
export interface DetectedDataStructure {
  /** Name of the data structure */
  name: string;
  /** Normalized identifier */
  id: string;
  /** Minimum methods required */
  minMethods: number;
  /** Required algorithms (e.g., dijkstra, bfs for graphs) */
  requiredAlgorithms: string[];
  /** Whether it needs visualization components */
  needsVisualization: boolean;
  /** Whether it needs animation frames */
  needsAnimationFrames: boolean;
}

/**
 * Project type detection result
 */
export interface ProjectTypeDetectionResult {
  /** Primary project type */
  primaryType: ProjectType;
  /** Secondary types (hybrid projects) */
  secondaryTypes: ProjectType[];
  /** Detected data structures */
  dataStructures: DetectedDataStructure[];
  /** Number of distinct operations/methods identified */
  operationsCount: number;
  /** Estimated minimum file count */
  estimatedMinFiles: number;
  /** Breakdown of expected files by category */
  fileBreakdown: FileBreakdown;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection rationale */
  rationale: string[];
  /** Flags for special requirements */
  flags: ProjectFlags;
}

/**
 * Breakdown of expected files by category
 */
export interface FileBreakdown {
  config: number;
  domain: number;
  application: number;
  infrastructure: number;
  tests: number;
  docs: number;
  devops: number;
  visualization?: number;
  animation?: number;
}

/**
 * Special project flags
 */
export interface ProjectFlags {
  /** Needs animation engine */
  needsAnimation: boolean;
  /** Needs pseudocode display */
  needsPseudocode: boolean;
  /** Needs operation logging */
  needsLogging: boolean;
  /** Needs playback controls */
  needsPlaybackControls: boolean;
  /** Needs step-by-step execution */
  needsStepExecution: boolean;
  /** Has multiple data structures */
  hasMultipleStructures: boolean;
  /** Is educational/didactic */
  isEducational: boolean;
  /** Needs responsive design */
  needsResponsive: boolean;
}

/**
 * Data structure definition with detection patterns
 */
interface DataStructureDefinition {
  id: string;
  name: string;
  patterns: RegExp[];
  minMethods: number;
  algorithmPatterns?: RegExp[];
  defaultAlgorithms?: string[];
}

/**
 * Project Type Detector
 *
 * Analyzes user prompts to detect project type and calculate expected file counts.
 */
export class ProjectTypeDetector {
  // ==================== DATA STRUCTURE DEFINITIONS ====================

  private readonly DATA_STRUCTURES: DataStructureDefinition[] = [
    {
      id: "array",
      name: "Array/Vetor",
      patterns: [/\barray\b/i, /\bvetor\b/i, /\bvector\b/i],
      minMethods: 10,
    },
    {
      id: "singly-linked-list",
      name: "Lista Ligada Simples",
      patterns: [
        /lista\s+ligada\s+simples/i,
        /singly\s*linked\s*list/i,
        /lista\s+encadeada\s+simples/i,
      ],
      minMethods: 10,
    },
    {
      id: "doubly-linked-list",
      name: "Lista Duplamente Ligada",
      patterns: [
        /lista\s+duplamente\s+ligada/i,
        /doubly\s*linked\s*list/i,
        /lista\s+dupla/i,
        /lista\s+encadeada\s+dupla/i,
      ],
      minMethods: 10,
    },
    {
      id: "stack",
      name: "Pilha/Stack",
      patterns: [/\bstack\b/i, /\bpilha\b/i],
      minMethods: 8,
    },
    {
      id: "queue",
      name: "Fila/Queue",
      patterns: [/\bqueue\b/i, /\bfila\b/i, /\bdeque\b/i],
      minMethods: 8,
    },
    {
      id: "binary-search-tree",
      name: "Árvore Binária de Busca",
      patterns: [
        /árvore\s*binária/i,
        /binary\s*search\s*tree/i,
        /\bbst\b/i,
        /árvore\s*de\s*busca/i,
      ],
      minMethods: 11,
      defaultAlgorithms: ["inOrder", "preOrder", "postOrder"],
    },
    {
      id: "avl-tree",
      name: "Árvore AVL",
      patterns: [/\bavl\b/i, /árvore\s*avl/i],
      minMethods: 12,
      defaultAlgorithms: ["rotate", "balance"],
    },
    {
      id: "heap",
      name: "Heap/Fila de Prioridade",
      patterns: [/\bheap\b/i, /priority\s*queue/i, /fila\s*de\s*prioridade/i],
      minMethods: 10,
    },
    {
      id: "graph",
      name: "Grafo",
      patterns: [/\bgrafo\b/i, /\bgraph\b/i],
      minMethods: 11,
      algorithmPatterns: [
        /\bdijkstra\b/i,
        /\bprim\b/i,
        /\bkruskal\b/i,
        /\bbfs\b/i,
        /\bdfs\b/i,
        /\bbellman/i,
        /breadth\s*first/i,
        /depth\s*first/i,
      ],
      defaultAlgorithms: ["bfs", "dfs"],
    },
    {
      id: "hash-table",
      name: "Tabela Hash",
      patterns: [/hash\s*table/i, /hash\s*map/i, /tabela\s*hash/i, /\bhashmap\b/i],
      minMethods: 10,
    },
    {
      id: "trie",
      name: "Trie",
      patterns: [/\btrie\b/i, /prefix\s*tree/i, /árvore\s*de\s*prefixos/i],
      minMethods: 8,
    },
  ];

  // ==================== PROJECT TYPE PATTERNS ====================

  private readonly VISUALIZATION_PATTERNS: RegExp[] = [
    /visualiza[çc][aã]o/i,
    /visualization/i,
    /visualizar/i,
    /visualize/i,
    /simula[çc][aã]o/i,
    /simulation/i,
    /simular/i,
    /simulate/i,
    /anima[çc][aã]o/i,
    /animation/i,
    /animar/i,
    /animate/i,
    /passo\s*a\s*passo/i,
    /step[\s-]*by[\s-]*step/i,
    /interativ[ao]/i,
    /interactive/i,
  ];

  private readonly EDUCATIONAL_PATTERNS: RegExp[] = [
    /did[áa]tic[ao]/i,
    /didactic/i,
    /educacion/i,
    /educational/i,
    /aprendizado/i,
    /learning/i,
    /estudante/i,
    /student/i,
    /professor/i,
    /teacher/i,
    /ensino/i,
    /teaching/i,
    /aula/i,
    /lesson/i,
    /curso/i,
    /course/i,
    /tutorial/i,
  ];

  private readonly ANIMATION_PATTERNS: RegExp[] = [
    /play/i,
    /pause/i,
    /velocidade/i,
    /speed/i,
    /controle/i,
    /control/i,
    /timeline/i,
    /frame/i,
    /step/i,
    /avan[çc]ar/i,
    /forward/i,
    /voltar/i,
    /backward/i,
    /reset/i,
  ];

  private readonly PSEUDOCODE_PATTERNS: RegExp[] = [
    /pseudoc[óo]digo/i,
    /pseudocode/i,
    /pseudo[\s-]*c[óo]digo/i,
    /código\s*sincronizado/i,
    /synchronized\s*code/i,
    /highlight/i,
    /destaque/i,
    /linha\s*atual/i,
    /current\s*line/i,
  ];

  private readonly LOGGING_PATTERNS: RegExp[] = [
    /hist[óo]rico/i,
    /history/i,
    /log/i,
    /registro/i,
    /record/i,
    /opera[çc][õo]es/i,
    /operations/i,
  ];

  // ==================== MAIN DETECTION METHOD ====================

  /**
   * Detects project type and calculates expected file counts
   *
   * @param userPrompt - The user's prompt/requirements
   * @returns Detection result with project type and file estimates
   */
  public detect(userPrompt: string): ProjectTypeDetectionResult {
    const rationale: string[] = [];

    // 1. Detect data structures
    const dataStructures = this.detectDataStructures(userPrompt);
    rationale.push(`Detected ${dataStructures.length} data structures`);

    // 2. Detect project type
    const { primaryType, secondaryTypes, confidence } = this.detectProjectType(
      userPrompt,
      dataStructures
    );
    rationale.push(`Primary type: ${primaryType} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    if (secondaryTypes.length > 0) {
      rationale.push(`Secondary types: ${secondaryTypes.join(", ")}`);
    }

    // 3. Detect project flags
    const flags = this.detectFlags(userPrompt, dataStructures, primaryType);

    // 4. Count operations
    const operationsCount = this.countOperations(userPrompt, dataStructures);

    return {
      primaryType,
      secondaryTypes,
      dataStructures,
      operationsCount,
      estimatedMinFiles: 0,
      fileBreakdown: { config: 0, domain: 0, application: 0, infrastructure: 0, tests: 0, docs: 0, devops: 0 },
      confidence,
      rationale,
      flags,
    };
  }

  // ==================== DATA STRUCTURE DETECTION ====================

  /**
   * Detects data structures mentioned in the prompt
   */
  private detectDataStructures(userPrompt: string): DetectedDataStructure[] {
    const detected: DetectedDataStructure[] = [];
    const lowerPrompt = userPrompt.toLowerCase();

    for (const def of this.DATA_STRUCTURES) {
      // Check if any pattern matches
      const matches = def.patterns.some((pattern) => pattern.test(userPrompt));
      if (!matches) continue;

      // Detect required algorithms
      const requiredAlgorithms: string[] = [];
      if (def.algorithmPatterns) {
        for (const algoPattern of def.algorithmPatterns) {
          if (algoPattern.test(userPrompt)) {
            const match = userPrompt.match(algoPattern);
            if (match) {
              requiredAlgorithms.push(match[0].toLowerCase());
            }
          }
        }
      }
      // Add default algorithms if none detected
      if (requiredAlgorithms.length === 0 && def.defaultAlgorithms) {
        requiredAlgorithms.push(...def.defaultAlgorithms);
      }

      // Check for method count requirements
      let minMethods = def.minMethods;
      const methodCountMatch =
        lowerPrompt.match(/pelo\s+menos\s+(\d+)\s+m[eé]todos/i) ||
        lowerPrompt.match(/minimum\s+(\d+)\s+methods/i) ||
        lowerPrompt.match(/≥\s*(\d+)\s+m[eé]todos/i) ||
        lowerPrompt.match(/no\s+m[íi]nimo\s+(\d+)/i);
      if (methodCountMatch) {
        const requestedMethods = parseInt(methodCountMatch[1], 10);
        if (requestedMethods > minMethods) {
          minMethods = requestedMethods;
        }
      }

      detected.push({
        name: def.name,
        id: def.id,
        minMethods,
        requiredAlgorithms,
        needsVisualization: true,
        needsAnimationFrames: true,
      });
    }

    return detected;
  }

  // ==================== PROJECT TYPE DETECTION ====================

  /**
   * Detects the primary and secondary project types
   */
  private detectProjectType(
    userPrompt: string,
    dataStructures: DetectedDataStructure[]
  ): {
    primaryType: ProjectType;
    secondaryTypes: ProjectType[];
    confidence: number;
  } {
    let visualizationScore = 0;
    let educationalScore = 0;
    let confidence = 0.5;

    // Count pattern matches
    for (const pattern of this.VISUALIZATION_PATTERNS) {
      if (pattern.test(userPrompt)) visualizationScore += 2;
    }
    for (const pattern of this.EDUCATIONAL_PATTERNS) {
      if (pattern.test(userPrompt)) educationalScore += 2;
    }
    for (const pattern of this.ANIMATION_PATTERNS) {
      if (pattern.test(userPrompt)) visualizationScore += 1;
    }
    for (const pattern of this.PSEUDOCODE_PATTERNS) {
      if (pattern.test(userPrompt)) {
        visualizationScore += 1;
        educationalScore += 1;
      }
    }

    // Data structures boost visualization/educational scores
    if (dataStructures.length > 0) {
      visualizationScore += dataStructures.length * 2;
      educationalScore += dataStructures.length;
    }

    // Multiple structures strongly suggest visualization project
    if (dataStructures.length >= 3) {
      visualizationScore += 5;
      confidence += 0.2;
    }

    // Determine primary type
    let primaryType: ProjectType = "GENERIC";
    const secondaryTypes: ProjectType[] = [];

    if (visualizationScore >= 5 && educationalScore >= 3) {
      primaryType = "VISUALIZATION";
      secondaryTypes.push("EDUCATIONAL");
      confidence = Math.min(0.95, 0.7 + visualizationScore * 0.02);
    } else if (visualizationScore >= 5) {
      primaryType = "VISUALIZATION";
      confidence = Math.min(0.9, 0.6 + visualizationScore * 0.02);
    } else if (educationalScore >= 5) {
      primaryType = "EDUCATIONAL";
      confidence = Math.min(0.9, 0.6 + educationalScore * 0.02);
    } else if (dataStructures.length >= 2) {
      primaryType = "VISUALIZATION";
      confidence = 0.7;
    } else if (dataStructures.length === 1) {
      primaryType = "LIBRARY";
      confidence = 0.6;
    }

    return { primaryType, secondaryTypes, confidence };
  }

  // ==================== FLAG DETECTION ====================

  /**
   * Detects special project flags
   */
  private detectFlags(
    userPrompt: string,
    dataStructures: DetectedDataStructure[],
    primaryType: ProjectType
  ): ProjectFlags {
    const isVisualization =
      primaryType === "VISUALIZATION" || primaryType === "EDUCATIONAL";

    return {
      needsAnimation:
        isVisualization || this.ANIMATION_PATTERNS.some((p) => p.test(userPrompt)),
      needsPseudocode: this.PSEUDOCODE_PATTERNS.some((p) => p.test(userPrompt)),
      needsLogging: this.LOGGING_PATTERNS.some((p) => p.test(userPrompt)),
      needsPlaybackControls:
        isVisualization ||
        /play|pause|velocidade|speed|control/i.test(userPrompt),
      needsStepExecution:
        isVisualization || /passo\s*a\s*passo|step/i.test(userPrompt),
      hasMultipleStructures: dataStructures.length > 1,
      isEducational:
        primaryType === "EDUCATIONAL" ||
        this.EDUCATIONAL_PATTERNS.some((p) => p.test(userPrompt)),
      needsResponsive: /responsiv|mobile|celular|tablet/i.test(userPrompt),
    };
  }

  // ==================== OPERATIONS COUNTING ====================

  /**
   * Counts the total number of operations/methods expected
   */
  private countOperations(
    _userPrompt: string,
    dataStructures: DetectedDataStructure[]
  ): number {
    let total = 0;
    for (const ds of dataStructures) {
      total += ds.minMethods;
    }
    return total;
  }

  // No hardcoded file counts. Validation is done semantically
  // (methods present, visualizers present, tests present, etc.)
  // not by arbitrary file count thresholds.
}

/**
 * Singleton instance for global use
 */
export const projectTypeDetector = new ProjectTypeDetector();
