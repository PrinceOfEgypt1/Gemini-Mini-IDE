import type { SandboxExecutor } from "./sandbox-executor.js";

/**
 * Metadata associated with a virtual file
 */
export interface FileMetadata {
  category?: string;
  purpose?: string;
  criticality?: string;
}

/**
 * Represents a file stored in the virtual filesystem
 */
export interface VirtualFile {
  path: string;
  content: string;
  language: string;
  metadata?: FileMetadata;
  lastModified: number;
}

/**
 * Information about an exported symbol
 */
export interface ExportInfo {
  name: string;
  kind: "class" | "interface" | "type" | "function" | "const" | "enum" | "default";
  line: number;
}

/**
 * Statistics about the virtual filesystem
 */
export interface VirtualFilesystemStats {
  totalFiles: number;
  totalLines: number;
  totalBytes: number;
}

/**
 * VirtualFilesystem - In-memory storage for generated files with export extraction
 *
 * This component serves as the long-term memory of the agent, storing
 * complete file contents and extracting exports to provide context
 * for subsequent LLM calls.
 *
 * @example
 * const vfs = new VirtualFilesystem();
 * vfs.set("src/types.ts", "export interface User { name: string; }");
 * const exports = vfs.getExports("src/types.ts");
 * // [{ name: "User", kind: "interface", line: 1 }]
 */
export class VirtualFilesystem {
  private files = new Map<string, VirtualFile>();

  /**
   * Stores a file in the virtual filesystem
   */
  public set(path: string, content: string, metadata?: FileMetadata): void {
    const language = this.detectLanguage(path);

    this.files.set(path, {
      path,
      content,
      language,
      metadata,
      lastModified: Date.now()
    });
  }

  /**
   * Retrieves file content by path
   */
  public get(path: string): string | null {
    const file = this.files.get(path);
    return file?.content ?? null;
  }

  /**
   * Checks if a file exists
   */
  public has(path: string): boolean {
    return this.files.has(path);
  }

  /**
   * Removes a file from the filesystem
   */
  public delete(path: string): boolean {
    return this.files.delete(path);
  }

  /**
   * Clears all files from the filesystem
   */
  public clear(): void {
    this.files.clear();
  }

  /**
   * Returns all file entries
   */
  public entries(): IterableIterator<[string, VirtualFile]> {
    return this.files.entries();
  }

  /**
   * Returns all file paths
   */
  public keys(): IterableIterator<string> {
    return this.files.keys();
  }

  /**
   * Returns the number of files
   */
  public get size(): number {
    return this.files.size;
  }

  /**
   * Extracts all exports from a TypeScript file
   */
  public getExports(path: string): ExportInfo[] {
    const file = this.files.get(path);
    if (!file) return [];

    return this.extractExports(file.content);
  }

  /**
   * Builds a compact context summary of all files for LLM context
   */
  public buildContextSummary(maxTokens: number = 4000): string {
    const lines: string[] = [];
    let estimatedTokens = 0;
    const tokensPerChar = 0.25; // Rough estimate

    // Sort files by criticality (HIGH first) then by number of exports
    const sortedFiles = Array.from(this.files.values()).sort((a, b) => {
      const critOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const aCrit = critOrder[a.metadata?.criticality || "MEDIUM"] ?? 1;
      const bCrit = critOrder[b.metadata?.criticality || "MEDIUM"] ?? 1;
      if (aCrit !== bCrit) return aCrit - bCrit;

      const aExports = this.extractExports(a.content).length;
      const bExports = this.extractExports(b.content).length;
      return bExports - aExports;
    });

    for (const file of sortedFiles) {
      const exports = this.extractExports(file.content);
      const exportNames = exports.map(e => e.name).join(", ");
      const line = exports.length > 0
        ? `${file.path} (exports: ${exportNames})`
        : `${file.path}`;

      const lineTokens = line.length * tokensPerChar;
      if (estimatedTokens + lineTokens > maxTokens) {
        lines.push(`... and ${sortedFiles.length - lines.length} more files`);
        break;
      }

      lines.push(line);
      estimatedTokens += lineTokens;
    }

    return lines.join("\n");
  }

  /**
   * Builds focused context for generating a specific file
   */
  public buildFileContext(targetPath: string, maxTokens: number = 6000): string {
    const sections: string[] = [];
    let estimatedTokens = 0;
    const tokensPerChar = 0.25;

    const targetDir = targetPath.split("/").slice(0, -1).join("/");

    // Priority 1: Type definition files (full content)
    const typeFiles = Array.from(this.files.values()).filter(f =>
      f.path.includes("types") ||
      f.path.includes("interfaces") ||
      f.path.endsWith(".d.ts") ||
      f.path.match(/\/index\.ts$/)
    );

    for (const file of typeFiles) {
      const header = `\n// === ${file.path} ===\n`;
      const content = file.content;
      const tokens = (header.length + content.length) * tokensPerChar;

      if (estimatedTokens + tokens < maxTokens * 0.4) {
        sections.push(header + content);
        estimatedTokens += tokens;
      }
    }

    // Priority 2: Files in same directory (exports only)
    const sameDir = Array.from(this.files.values()).filter(f =>
      f.path.startsWith(targetDir + "/") && !typeFiles.includes(f)
    );

    for (const file of sameDir) {
      const exports = this.extractExports(file.content);
      if (exports.length > 0) {
        const exportSummary = exports.map(e => `${e.kind} ${e.name}`).join(", ");
        const line = `// ${file.path}: ${exportSummary}`;
        const tokens = line.length * tokensPerChar;

        if (estimatedTokens + tokens < maxTokens * 0.7) {
          sections.push(line);
          estimatedTokens += tokens;
        }
      }
    }

    // Priority 3: Domain files (exports only)
    const domainFiles = Array.from(this.files.values()).filter(f =>
      (f.path.includes("domain") || f.path.includes("model")) &&
      !typeFiles.includes(f) &&
      !sameDir.includes(f)
    );

    for (const file of domainFiles) {
      const exports = this.extractExports(file.content);
      if (exports.length > 0) {
        const exportSummary = exports.map(e => `${e.kind} ${e.name}`).join(", ");
        const line = `// ${file.path}: ${exportSummary}`;
        const tokens = line.length * tokensPerChar;

        if (estimatedTokens + tokens < maxTokens * 0.85) {
          sections.push(line);
          estimatedTokens += tokens;
        }
      }
    }

    // Priority 4: Remaining files (just paths)
    const remaining = Array.from(this.files.values()).filter(f =>
      !typeFiles.includes(f) &&
      !sameDir.includes(f) &&
      !domainFiles.includes(f)
    );

    if (remaining.length > 0) {
      const remainingPaths = remaining.map(f => f.path).join(", ");
      const line = `// Other files: ${remainingPaths}`;
      const tokens = line.length * tokensPerChar;

      if (estimatedTokens + tokens < maxTokens) {
        sections.push(line);
      }
    }

    return sections.join("\n");
  }

  /**
   * Synchronizes all files to a sandbox executor
   */
  public async syncToSandbox(sandbox: SandboxExecutor): Promise<void> {
    for (const [path, file] of this.files) {
      await sandbox.writeFile(path, file.content);
    }
  }

  /**
   * Returns filesystem statistics
   */
  public get stats(): VirtualFilesystemStats {
    let totalLines = 0;
    let totalBytes = 0;

    for (const file of this.files.values()) {
      totalLines += file.content.split("\n").length;
      totalBytes += Buffer.byteLength(file.content, "utf-8");
    }

    return {
      totalFiles: this.files.size,
      totalLines,
      totalBytes
    };
  }

  /**
   * Extracts exports from TypeScript/JavaScript content
   */
  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split("\n");

    const patterns: Array<{ regex: RegExp; kind: ExportInfo["kind"] }> = [
      { regex: /^\s*export\s+class\s+(\w+)/,        kind: "class" },
      { regex: /^\s*export\s+abstract\s+class\s+(\w+)/, kind: "class" },
      { regex: /^\s*export\s+interface\s+(\w+)/,    kind: "interface" },
      { regex: /^\s*export\s+type\s+(\w+)/,         kind: "type" },
      { regex: /^\s*export\s+function\s+(\w+)/,     kind: "function" },
      { regex: /^\s*export\s+async\s+function\s+(\w+)/, kind: "function" },
      { regex: /^\s*export\s+const\s+(\w+)/,        kind: "const" },
      { regex: /^\s*export\s+let\s+(\w+)/,          kind: "const" },
      { regex: /^\s*export\s+var\s+(\w+)/,          kind: "const" },
      { regex: /^\s*export\s+enum\s+(\w+)/,         kind: "enum" },
      { regex: /^\s*export\s+default\s+class\s+(\w+)/, kind: "default" },
      { regex: /^\s*export\s+default\s+function\s+(\w+)/, kind: "default" },
      { regex: /^\s*export\s+default\s+(\w+)/,      kind: "default" }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { regex, kind } of patterns) {
        const match = line.match(regex);
        if (match && match[1]) {
          exports.push({
            name: match[1],
            kind,
            line: i + 1
          });
          break; // Only match one pattern per line
        }
      }
    }

    return exports;
  }

  /**
   * Detects programming language from file extension
   */
  private detectLanguage(path: string): string {
    if (path.match(/\.(ts|tsx)$/)) return "typescript";
    if (path.match(/\.(js|jsx)$/)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.match(/\.(yml|yaml)$/)) return "yaml";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    return "plaintext";
  }
}
