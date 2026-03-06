import ts from "typescript";

/**
 * Contract violation found during validation
 */
export interface ContractViolation {
  type: "MISSING_EXPORT" | "MISSING_METHOD" | "MISSING_CLASS" | "MISSING_INTERFACE" | "MISSING_FUNCTION" | "EMPTY_IMPLEMENTATION" | "STUB_DETECTED";
  expected: string;
  message: string;
}

/**
 * Result of contract validation
 */
export interface ContractValidationResult {
  isValid: boolean;
  violations: ContractViolation[];
  exports: string[];
  classes: string[];
  functions: string[];
  interfaces: string[];
  methods: Map<string, string[]>;
}

/**
 * ContractValidator - Validates that generated code fulfills its promised contract
 *
 * The LLM defines what a file should contain in the manifest's "purpose" field.
 * This validator uses TypeScript AST to verify the code actually delivers on
 * those promises.
 *
 * Example: If purpose says "Stack class with push, pop, peek, isEmpty methods",
 * we verify the code exports a Stack class with those methods.
 */
export class ContractValidator {
  /**
   * Validates that code fulfills the contract specified in purpose
   */
  public validate(
    code: string,
    purpose: string,
    filePath: string
  ): ContractValidationResult {
    const violations: ContractViolation[] = [];

    // Skip non-TypeScript files
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      return {
        isValid: true,
        violations: [],
        exports: [],
        classes: [],
        functions: [],
        interfaces: [],
        methods: new Map()
      };
    }

    // Parse the code into AST
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    // Extract what the code actually provides
    const analysis = this.analyzeSourceFile(sourceFile);

    // Extract what was promised in purpose
    const promises = this.extractPromises(purpose);

    // Validate promises are fulfilled
    this.validatePromises(promises, analysis, violations);

    // Check for stub/placeholder implementations
    this.detectStubs(code, violations);

    return {
      isValid: violations.length === 0,
      violations,
      ...analysis
    };
  }

  /**
   * Analyzes a TypeScript source file to extract its exports
   */
  private analyzeSourceFile(sourceFile: ts.SourceFile): {
    exports: string[];
    classes: string[];
    functions: string[];
    interfaces: string[];
    methods: Map<string, string[]>;
  } {
    const exports: string[] = [];
    const classes: string[] = [];
    const functions: string[] = [];
    const interfaces: string[] = [];
    const methods = new Map<string, string[]>();

    const visit = (node: ts.Node): void => {
      const isExported = this.hasExportModifier(node);

      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        classes.push(className);
        if (isExported) exports.push(className);

        const classMethods: string[] = [];
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodName = this.getPropertyName(member.name);
            if (methodName && !methodName.startsWith("_")) {
              classMethods.push(methodName);
            }
          }
          if (ts.isGetAccessor(member) && member.name) {
            const name = this.getPropertyName(member.name);
            if (name) classMethods.push(name);
          }
        });
        methods.set(className, classMethods);
      }

      if (ts.isFunctionDeclaration(node) && node.name) {
        const funcName = node.name.text;
        functions.push(funcName);
        if (isExported) exports.push(funcName);
      }

      if (ts.isInterfaceDeclaration(node) && node.name) {
        const interfaceName = node.name.text;
        interfaces.push(interfaceName);
        if (isExported) exports.push(interfaceName);
      }

      if (ts.isTypeAliasDeclaration(node) && node.name) {
        const typeName = node.name.text;
        if (isExported) exports.push(typeName);
      }

      if (ts.isVariableStatement(node) && this.hasExportModifier(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        });
      }

      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach(el => {
            exports.push(el.name.text);
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { exports, classes, functions, interfaces, methods };
  }

  /**
   * Extracts promises from a purpose description
   */
  private extractPromises(purpose: string): {
    classes: string[];
    methods: Map<string, string[]>;
    functions: string[];
    interfaces: string[];
    expectedMethodCounts: Map<string, number>;
  } {
    const classes: string[] = [];
    const methods = new Map<string, string[]>();
    const functions: string[] = [];
    const interfaces: string[] = [];
    const expectedMethodCounts = new Map<string, number>();

    const lowerPurpose = purpose.toLowerCase();
    let match;

    // Pattern: "ClassName class with methods: method1, method2, method3"
    const classWithMethodsPattern = /(\w+)\s+class\s+with\s+(?:methods?:?\s*)?([^.]+)/gi;
    while ((match = classWithMethodsPattern.exec(purpose)) !== null) {
      const className = match[1];
      classes.push(className);
      const methodsStr = match[2];
      const extractedMethods = this.extractMethodNames(methodsStr);
      if (extractedMethods.length > 0) {
        methods.set(className, extractedMethods);
      }
    }

    // Pattern: "ClassName class" (without methods)
    const simpleClassPattern = /\b([A-Z][a-zA-Z0-9]*)\s+class\b/g;
    while ((match = simpleClassPattern.exec(purpose)) !== null) {
      const className = match[1];
      if (!classes.includes(className)) {
        classes.push(className);
      }
    }

    // Pattern: "class ClassName"
    const classKeywordPattern = /\bclass\s+([A-Z][a-zA-Z0-9]*)\b/g;
    while ((match = classKeywordPattern.exec(purpose)) !== null) {
      const className = match[1];
      if (!classes.includes(className)) {
        classes.push(className);
      }
    }

    // Pattern: "(N methods)" - extract expected count
    const methodCountPattern = /\((\d+)\s*m[eé]todos?\)/i;
    const countMatch = methodCountPattern.exec(purpose);
    if (countMatch && classes.length > 0) {
      const expectedCount = parseInt(countMatch[1], 10);
      expectedMethodCounts.set(classes[0], expectedCount);
    }

    // Pattern: "interface InterfaceName"
    const interfacePattern = /\binterface\s+([A-Z][a-zA-Z0-9]*)\b/g;
    while ((match = interfacePattern.exec(purpose)) !== null) {
      interfaces.push(match[1]);
    }

    // Extract methods mentioned by common names if none explicitly listed
    if (classes.length > 0 && (!methods.has(classes[0]) || methods.get(classes[0])?.length === 0)) {
      const commonMethods = this.extractCommonMethodNames(lowerPurpose);
      if (commonMethods.length > 0) {
        methods.set(classes[0], commonMethods);
      }
    }

    return { classes, methods, functions, interfaces, expectedMethodCounts };
  }

  /**
   * Extracts method names from a string like "push, pop, peek, isEmpty"
   */
  private extractMethodNames(str: string): string[] {
    const methodList: string[] = [];
    const parts = str.split(/[,;/]/);

    for (const part of parts) {
      const m = part.match(/\b([a-z][a-zA-Z0-9_]*)\b/);
      if (m && !this.isStopWord(m[1])) {
        methodList.push(m[1]);
      }
    }

    return methodList;
  }

  /**
   * Extracts common data structure method names mentioned in text
   */
  private extractCommonMethodNames(text: string): string[] {
    const commonMethods = [
      "push", "pop", "peek", "enqueue", "dequeue",
      "insert", "remove", "delete", "search", "find", "get", "set",
      "add", "clear", "size", "length", "isEmpty", "isFull", "contains",
      "traverse", "inOrder", "preOrder", "postOrder", "levelOrder",
      "min", "max", "findMin", "findMax", "getMin", "getMax",
      "addNode", "addEdge", "removeNode", "removeEdge",
      "bfs", "dfs", "dijkstra", "prim", "kruskal",
      "sort", "reverse", "toArray", "toString"
    ];

    const found: string[] = [];
    for (const method of commonMethods) {
      if (text.includes(method.toLowerCase())) {
        found.push(method);
      }
    }

    return found;
  }

  /**
   * Checks if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      "with", "and", "the", "for", "that", "this", "from", "have", "has",
      "methods", "method", "class", "function", "interface", "type",
      "implementation", "implements", "extends", "export", "import"
    ]);
    return stopWords.has(word.toLowerCase());
  }

  /**
   * Validates that promises are fulfilled by the code
   */
  private validatePromises(
    promises: ReturnType<typeof this.extractPromises>,
    analysis: ReturnType<typeof this.analyzeSourceFile>,
    violations: ContractViolation[]
  ): void {
    // Validate classes exist
    for (const expectedClass of promises.classes) {
      const found = analysis.classes.some(
        c => c.toLowerCase() === expectedClass.toLowerCase()
      );
      if (!found) {
        violations.push({
          type: "MISSING_CLASS",
          expected: expectedClass,
          message: `Promised class "${expectedClass}" not found in code`
        });
      }
    }

    // Validate methods exist for each class
    for (const [className, expectedMethods] of promises.methods) {
      const actualClass = analysis.classes.find(
        c => c.toLowerCase() === className.toLowerCase()
      );

      if (!actualClass) continue;

      const actualMethods = analysis.methods.get(actualClass) || [];

      for (const expectedMethod of expectedMethods) {
        const found = actualMethods.some(
          m => m.toLowerCase() === expectedMethod.toLowerCase()
        );
        if (!found) {
          violations.push({
            type: "MISSING_METHOD",
            expected: `${className}.${expectedMethod}`,
            message: `Promised method "${expectedMethod}" not found in class "${actualClass}"`
          });
        }
      }

      // Check expected method count if specified
      if (promises.expectedMethodCounts.has(className)) {
        const expectedCount = promises.expectedMethodCounts.get(className)!;
        if (actualMethods.length < expectedCount) {
          violations.push({
            type: "MISSING_METHOD",
            expected: `${expectedCount} methods`,
            message: `Class "${actualClass}" has ${actualMethods.length} methods but ${expectedCount} were promised`
          });
        }
      }
    }

    // Validate interfaces exist
    for (const expectedInterface of promises.interfaces) {
      const found = analysis.interfaces.some(
        i => i.toLowerCase() === expectedInterface.toLowerCase()
      );
      if (!found) {
        violations.push({
          type: "MISSING_INTERFACE",
          expected: expectedInterface,
          message: `Promised interface "${expectedInterface}" not found in code`
        });
      }
    }

    // Validate functions exist
    for (const expectedFunc of promises.functions) {
      const found = analysis.functions.some(
        f => f.toLowerCase() === expectedFunc.toLowerCase()
      );
      if (!found) {
        violations.push({
          type: "MISSING_FUNCTION",
          expected: expectedFunc,
          message: `Promised function "${expectedFunc}" not found in code`
        });
      }
    }
  }

  /**
   * Detects stub/placeholder implementations in code
   */
  private detectStubs(code: string, violations: ContractViolation[]): void {
    // Detect throw new Error("Not implemented")
    if (/throw\s+new\s+Error\s*\(\s*["']not\s+implemented["']/i.test(code)) {
      violations.push({
        type: "STUB_DETECTED",
        expected: "Real implementation",
        message: 'Code contains "throw new Error(\'Not implemented\')" stub'
      });
    }

    // Detect empty method bodies
    const emptyMethodPattern = /\)\s*:\s*\w+\s*\{\s*\}/g;
    if (emptyMethodPattern.test(code)) {
      violations.push({
        type: "EMPTY_IMPLEMENTATION",
        expected: "Non-empty method body",
        message: "Code contains methods with empty bodies"
      });
    }

    // Detect "return undefined" or "return null" as only statement
    const returnNullPattern = /\{\s*return\s+(undefined|null)\s*;?\s*\}/g;
    if (returnNullPattern.test(code)) {
      violations.push({
        type: "STUB_DETECTED",
        expected: "Real implementation",
        message: "Code contains methods that only return undefined/null"
      });
    }
  }

  /**
   * Checks if a node has the export modifier
   */
  private hasExportModifier(node: ts.Node): boolean {
    if (!ts.canHaveModifiers(node)) return false;
    const modifiers = ts.getModifiers(node);
    return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  /**
   * Gets property name from a PropertyName node
   */
  private getPropertyName(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name)) return name.text;
    if (ts.isStringLiteral(name)) return name.text;
    return undefined;
  }
}
