import type {
  RichArchitecture,
  FileCategory,
  Criticality,
  RichManifestItem,
} from "../types/rich-schemas.js";
import type { ProjectTypeDetectionResult } from "../planning/project-type-detector.js";
import { projectTypeDetector } from "../planning/project-type-detector.js";

/**
 * Type for the addFile helper function
 */
type AddFileFunction = (
  path: string,
  purpose: string,
  category: FileCategory,
  criticality?: Criticality
) => void;

/**
 * Structure Auditor - Audits and fixes the architecture manifest
 *
 * This class ensures that the manifest has all required files based on:
 * - Basic project requirements (README, package.json, etc.)
 * - Framework-specific requirements (vite.config for React, etc.)
 * - Project type requirements (visualization projects need animation files, etc.)
 *
 * @class StructureAuditor
 */
export class StructureAuditor {
  /**
   * Audita a arquitetura e injeta arquivos obrigatórios se estiverem faltando.
   *
   * @param architecture - The architecture to audit
   * @param userPrompt - Optional user prompt for project type detection
   * @returns Fixed architecture with all required files
   */
  public auditAndFix(
    architecture: RichArchitecture,
    userPrompt?: string
  ): RichArchitecture {
    const fixedManifest: RichManifestItem[] = [...architecture.manifest];
    const stack = architecture.stack;

    const manifestPaths = new Set(fixedManifest.map((f) => f.path.toLowerCase()));

    const addFile: AddFileFunction = (
      path: string,
      purpose: string,
      category: FileCategory,
      criticality: Criticality = "HIGH"
    ) => {
      if (!manifestPaths.has(path.toLowerCase())) {
        fixedManifest.push({ path, purpose, category, criticality });
        manifestPaths.add(path.toLowerCase());
        // eslint-disable-next-line no-console
        console.log(`[StructureAuditor] Added missing file: ${path}`);
      }
    };

    // 1. Documentação Obrigatória
    addFile("README.md", "Documentation entry point", "DOCS");
    addFile("USER_STORIES.md", "Project requirements and stories", "DOCS");

    // 2. Configuração Básica (Baseado na Stack)
    if (stack.runtime.toLowerCase().includes("node")) {
      addFile("package.json", "Project dependencies and scripts", "CONFIG");
    }

    if (stack.language.toLowerCase().includes("typescript")) {
      addFile("tsconfig.json", "TypeScript compiler configuration", "CONFIG");
      addFile(
        "tsconfig.node.json",
        "TypeScript node configuration",
        "CONFIG",
        "MEDIUM"
      );
    }

    // 3. Framework specific checks
    if (stack.framework.toLowerCase().includes("react")) {
      addFile("vite.config.ts", "Vite build configuration", "CONFIG");
      addFile("vitest.config.ts", "Vitest test configuration", "CONFIG");

      // Verifica se existe algum entrypoint
      const hasEntrypoint =
        fixedManifest.some((f) => f.path === "src/main.tsx") ||
        fixedManifest.some((f) => f.path === "src/main.ts") ||
        fixedManifest.some((f) => f.path === "src/index.tsx") ||
        fixedManifest.some((f) => f.path === "src/index.ts");

      if (!hasEntrypoint) {
        addFile("src/main.tsx", "Application entrypoint", "APPLICATION");
      }

      // App component
      const hasApp =
        fixedManifest.some((f) => f.path === "src/App.tsx") ||
        fixedManifest.some((f) => f.path === "src/App.ts");
      if (!hasApp) {
        addFile("src/App.tsx", "Root application component", "APPLICATION");
      }
    }

    // 4. DevOps básico
    addFile(".github/workflows/ci.yml", "CI pipeline configuration", "DEVOPS");

    // 5. Linting e formatação
    addFile("eslint.config.js", "ESLint configuration", "CONFIG", "MEDIUM");

    // 6. Styling (if React/frontend)
    if (
      stack.framework.toLowerCase().includes("react") ||
      stack.framework.toLowerCase().includes("vue") ||
      stack.framework.toLowerCase().includes("angular")
    ) {
      addFile("tailwind.config.cjs", "Tailwind CSS configuration", "CONFIG", "MEDIUM");
      addFile("postcss.config.cjs", "PostCSS configuration", "CONFIG", "MEDIUM");
      addFile("src/styles/index.css", "Global styles", "APPLICATION", "MEDIUM");
    }

    // 7. Detect project type and add visualization-specific files
    if (userPrompt) {
      const detection = projectTypeDetector.detect(userPrompt);
      this.addVisualizationFiles(detection, addFile);
    } else {
      // Try to detect from manifest patterns
      const hasVisualizationPatterns = this.detectVisualizationFromManifest(
        fixedManifest
      );
      if (hasVisualizationPatterns) {
        this.addBasicVisualizationInfrastructure(addFile);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[StructureAuditor] Final manifest size: ${fixedManifest.length} files`
    );

    return {
      ...architecture,
      manifest: fixedManifest,
    };
  }

  /**
   * Detects if the manifest indicates a visualization project
   */
  private detectVisualizationFromManifest(manifest: RichManifestItem[]): boolean {
    const patterns = [
      /visualiz/i,
      /animation/i,
      /frame/i,
      /data-structure/i,
      /simulator/i,
      /pseudocode/i,
    ];

    return manifest.some((item) =>
      patterns.some(
        (pattern) => pattern.test(item.path) || pattern.test(item.purpose)
      )
    );
  }

  /**
   * Adds visualization-specific files based on project type detection
   */
  private addVisualizationFiles(
    detection: ProjectTypeDetectionResult,
    addFile: AddFileFunction
  ): void {
    // Only add for visualization/educational projects
    if (
      detection.primaryType !== "VISUALIZATION" &&
      detection.primaryType !== "EDUCATIONAL"
    ) {
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[StructureAuditor] Detected ${detection.primaryType} project with ${detection.dataStructures.length} data structures`
    );

    // Add animation infrastructure
    if (detection.flags.needsAnimation) {
      this.addAnimationInfrastructure(addFile);
    }

    // Add store infrastructure
    this.addStoreInfrastructure(addFile);

    // Add operation framework
    this.addOperationFramework(addFile);

    // Add simulator components
    if (detection.flags.needsPlaybackControls) {
      this.addSimulatorComponents(addFile);
    }

    // Add common components
    this.addCommonComponents(addFile);

    // Add layout components
    this.addLayoutComponents(addFile);

    // Add utilities
    this.addUtilities(addFile);

    // Add files for each detected data structure
    for (const ds of detection.dataStructures) {
      this.addDataStructureFiles(ds.id, ds.name, ds.minMethods, addFile);
    }

    // Add home page
    addFile("src/pages/HomePage.tsx", "Home page with structure selection", "APPLICATION");

    // Add documentation
    this.addVisualizationDocumentation(addFile);

    // Add tests infrastructure
    this.addTestInfrastructure(addFile);
  }

  /**
   * Adds basic visualization infrastructure when detecting from manifest patterns
   */
  private addBasicVisualizationInfrastructure(addFile: AddFileFunction): void {
    this.addAnimationInfrastructure(addFile);
    this.addStoreInfrastructure(addFile);
    this.addOperationFramework(addFile);
  }

  /**
   * Adds animation engine files
   */
  private addAnimationInfrastructure(addFile: AddFileFunction): void {
    addFile(
      "src/animation/steps.types.ts",
      "Animation step type definitions",
      "DOMAIN"
    );
    addFile(
      "src/animation/StepBuilder.ts",
      "Fluent builder for animation steps",
      "APPLICATION"
    );
    addFile(
      "src/animation/AnimationController.ts",
      "Animation playback controller",
      "APPLICATION"
    );
    addFile(
      "src/animation/useAnimationController.ts",
      "React hook for animation controller",
      "APPLICATION"
    );
    addFile(
      "src/animation/pseudocode.types.ts",
      "Pseudocode type definitions",
      "DOMAIN",
      "MEDIUM"
    );
    addFile(
      "src/animation/PseudocodeRegistry.ts",
      "Registry of pseudocode definitions",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/animation/log.types.ts",
      "Operation log type definitions",
      "DOMAIN",
      "MEDIUM"
    );
    addFile(
      "src/animation/OperationLogger.ts",
      "Operation logging service",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/animation/operationRuntime.ts",
      "Operation execution runtime",
      "APPLICATION"
    );
    addFile(
      "src/animation/frameSerializer.ts",
      "Frame serialization utilities",
      "APPLICATION",
      "MEDIUM"
    );
  }

  /**
   * Adds store/state management files
   */
  private addStoreInfrastructure(addFile: AddFileFunction): void {
    addFile(
      "src/store/simulation.store.ts",
      "Simulation state store",
      "APPLICATION"
    );
    addFile(
      "src/store/useSimulationStore.ts",
      "Simulation store hook",
      "APPLICATION"
    );
    addFile("src/store/store.types.ts", "Store type definitions", "DOMAIN", "MEDIUM");
  }

  /**
   * Adds operation framework files
   */
  private addOperationFramework(addFile: AddFileFunction): void {
    addFile(
      "src/application/operations/OperationId.ts",
      "Operation identifier enum",
      "DOMAIN"
    );
    addFile(
      "src/application/operations/OperationResult.ts",
      "Operation result type",
      "DOMAIN"
    );
    addFile(
      "src/application/operations/OperationRegistry.ts",
      "Central operation registry",
      "APPLICATION"
    );
    addFile(
      "src/application/operations/InputSchema.ts",
      "Input validation schemas",
      "DOMAIN"
    );
    addFile(
      "src/application/operations/validators.ts",
      "Input validators",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/application/operations/executeOperation.ts",
      "Operation executor",
      "APPLICATION"
    );
  }

  /**
   * Adds simulator components
   */
  private addSimulatorComponents(addFile: AddFileFunction): void {
    addFile(
      "src/components/simulator/OperationPanel.tsx",
      "Operation selection panel",
      "APPLICATION"
    );
    addFile(
      "src/components/simulator/ControlsBar.tsx",
      "Playback controls (play/pause/step)",
      "APPLICATION"
    );
    addFile(
      "src/components/simulator/Timeline.tsx",
      "Animation timeline",
      "APPLICATION"
    );
    addFile(
      "src/components/simulator/PseudocodePanel.tsx",
      "Pseudocode display with highlighting",
      "APPLICATION"
    );
    addFile(
      "src/components/simulator/LogPanel.tsx",
      "Operation log display",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/simulator/StateInspector.tsx",
      "State inspection panel",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/simulator/HelpDrawer.tsx",
      "Help and documentation drawer",
      "APPLICATION",
      "LOW"
    );
  }

  /**
   * Adds common components
   */
  private addCommonComponents(addFile: AddFileFunction): void {
    addFile("src/components/common/Button.tsx", "Button component", "APPLICATION");
    addFile("src/components/common/Input.tsx", "Text input component", "APPLICATION");
    addFile(
      "src/components/common/NumberInput.tsx",
      "Numeric input component",
      "APPLICATION"
    );
    addFile(
      "src/components/common/Select.tsx",
      "Select/dropdown component",
      "APPLICATION"
    );
    addFile(
      "src/components/common/Card.tsx",
      "Card container component",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/common/Panel.tsx",
      "Generic panel component",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/common/CodeBlock.tsx",
      "Code display component",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/common/Modal.tsx",
      "Modal dialog component",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/common/Badge.tsx",
      "Badge/tag component",
      "APPLICATION",
      "LOW"
    );
    addFile(
      "src/components/common/Tooltip.tsx",
      "Tooltip component",
      "APPLICATION",
      "LOW"
    );
  }

  /**
   * Adds layout components
   */
  private addLayoutComponents(addFile: AddFileFunction): void {
    addFile(
      "src/components/layout/Layout.tsx",
      "Main layout component",
      "APPLICATION"
    );
    addFile(
      "src/components/layout/Header.tsx",
      "Application header",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/layout/Sidebar.tsx",
      "Navigation sidebar",
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      "src/components/layout/Tabs.tsx",
      "Tab navigation component",
      "APPLICATION",
      "MEDIUM"
    );
  }

  /**
   * Adds utility files
   */
  private addUtilities(addFile: AddFileFunction): void {
    addFile("src/types/common.ts", "Shared type definitions", "DOMAIN");
    addFile("src/utils/assert.ts", "Assertion utilities", "APPLICATION", "MEDIUM");
    addFile("src/utils/uid.ts", "Unique ID generator", "APPLICATION", "MEDIUM");
    addFile("src/utils/clamp.ts", "Number clamping utility", "APPLICATION", "LOW");
    addFile("src/utils/array.ts", "Array utilities", "APPLICATION", "LOW");
    addFile("src/utils/math.ts", "Math utilities", "APPLICATION", "LOW");
    addFile("src/utils/format.ts", "Formatting utilities", "APPLICATION", "LOW");
    addFile("src/utils/storage.ts", "LocalStorage wrapper", "APPLICATION", "MEDIUM");
    addFile("src/config/constants.ts", "Application constants", "CONFIG", "MEDIUM");
    addFile("src/config/featureFlags.ts", "Feature toggles", "CONFIG", "LOW");
    addFile("src/routes/routes.tsx", "Route definitions", "APPLICATION");
  }

  /**
   * Adds files for a specific data structure
   */
  private addDataStructureFiles(
    dsId: string,
    dsName: string,
    minMethods: number,
    addFile: AddFileFunction
  ): void {
    const folderName = this.getFolderName(dsId);
    const className = this.getClassName(dsId);

    // Domain files
    addFile(
      `src/data-structures/${folderName}/${className}.ts`,
      `${dsName} class with ${minMethods}+ methods`,
      "DOMAIN"
    );
    addFile(
      `src/data-structures/${folderName}/${folderName}.types.ts`,
      `${dsName} type definitions`,
      "DOMAIN"
    );
    addFile(
      `src/data-structures/${folderName}/${folderName}.frames.ts`,
      `${dsName} animation frame generator`,
      "APPLICATION"
    );

    // Operation files
    addFile(
      `src/application/operations/${folderName}/${folderName}.operations.ts`,
      `${dsName} operation implementations`,
      "APPLICATION"
    );
    addFile(
      `src/application/operations/${folderName}/${folderName}.registry.ts`,
      `${dsName} operations registry`,
      "APPLICATION"
    );
    addFile(
      `src/application/operations/${folderName}/${folderName}.inputs.ts`,
      `${dsName} input schemas`,
      "APPLICATION",
      "MEDIUM"
    );
    addFile(
      `src/application/operations/${folderName}/${folderName}.pseudocode.ts`,
      `${dsName} pseudocode definitions`,
      "APPLICATION",
      "MEDIUM"
    );

    // Visualization files
    addFile(
      `src/components/visualizers/${folderName}/${className}Visualizer.tsx`,
      `${dsName} visualization container`,
      "APPLICATION"
    );
    addFile(
      `src/components/visualizers/${folderName}/${className}View.tsx`,
      `${dsName} visual representation`,
      "APPLICATION"
    );

    // Page file
    addFile(`src/pages/${className}Page.tsx`, `${dsName} simulator page`, "APPLICATION");

    // Test file
    addFile(`src/tests/${folderName}.test.ts`, `${dsName} unit tests`, "TESTS");
  }

  /**
   * Gets the folder name for a data structure ID
   */
  private getFolderName(dsId: string): string {
    const mapping: Record<string, string> = {
      array: "array",
      "singly-linked-list": "singly",
      "doubly-linked-list": "doubly",
      stack: "stack",
      queue: "queue",
      "binary-search-tree": "tree",
      "avl-tree": "avl",
      heap: "heap",
      graph: "graph",
      "hash-table": "hash",
      trie: "trie",
    };
    return mapping[dsId] || dsId.replace(/-/g, "");
  }

  /**
   * Gets the class name for a data structure ID
   */
  private getClassName(dsId: string): string {
    const mapping: Record<string, string> = {
      array: "CustomArray",
      "singly-linked-list": "SinglyLinkedList",
      "doubly-linked-list": "DoublyLinkedList",
      stack: "Stack",
      queue: "Queue",
      "binary-search-tree": "BinarySearchTree",
      "avl-tree": "AVLTree",
      heap: "Heap",
      graph: "WeightedGraph",
      "hash-table": "HashTable",
      trie: "Trie",
    };
    return mapping[dsId] || dsId.split("-").map(this.capitalize).join("");
  }

  /**
   * Capitalizes a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Adds visualization documentation files
   */
  private addVisualizationDocumentation(addFile: AddFileFunction): void {
    addFile(
      "docs/ARCHITECTURE.md",
      "Architecture documentation",
      "DOCS",
      "MEDIUM"
    );
    addFile("docs/REQUIREMENTS.md", "Requirements documentation", "DOCS", "MEDIUM");
    addFile("docs/TESTING.md", "Testing strategy", "DOCS", "LOW");
    addFile("docs/DEVELOPMENT.md", "Development guide", "DOCS", "LOW");
    addFile(
      "docs/OPERATIONS_CATALOG.md",
      "Catalog of all operations",
      "DOCS",
      "MEDIUM"
    );
    addFile(
      "docs/ANIMATION_MODEL.md",
      "Animation model documentation",
      "DOCS",
      "LOW"
    );
    addFile("docs/USER_GUIDE.md", "User guide", "DOCS", "MEDIUM");
  }

  /**
   * Adds test infrastructure files
   */
  private addTestInfrastructure(addFile: AddFileFunction): void {
    addFile(
      "src/tests/registry.integrity.test.ts",
      "Test that all operations are registered",
      "TESTS"
    );
    addFile("src/tests/smoke.build.test.ts", "Smoke test for build", "TESTS");
    addFile(
      "src/tests/animation.test.ts",
      "Animation controller tests",
      "TESTS",
      "MEDIUM"
    );
    addFile(
      "src/tests/operations.test.ts",
      "Operation registry tests",
      "TESTS",
      "MEDIUM"
    );
  }
}
