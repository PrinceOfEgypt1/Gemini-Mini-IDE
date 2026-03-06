import { mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TechStack } from "../types/rich-schemas.js";

const execFileAsync = promisify(execFile);

/**
 * Result of a sandbox command execution
 */
export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * SandboxExecutor - Executes real TypeScript compilation in a temporary directory
 *
 * This component provides isolated execution environment for validating
 * generated code with actual `tsc --noEmit` compilation.
 *
 * @example
 * const sandbox = new SandboxExecutor();
 * await sandbox.initialize({ runtime: "Node.js", language: "TypeScript", framework: "React", ... });
 * await sandbox.writeFile("src/index.ts", "export const x: number = 1;");
 * const result = await sandbox.typecheck();
 * console.log(result.success); // true
 * await sandbox.cleanup();
 */
export class SandboxExecutor {
  private sandboxPath: string | null = null;
  private initialized = false;

  /**
   * Gets the sandbox directory path
   */
  public get path(): string | null {
    return this.sandboxPath;
  }

  /**
   * Checks if sandbox is initialized
   */
  public get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initializes the sandbox with package.json and tsconfig.json based on tech stack
   */
  public async initialize(stack: TechStack): Promise<void> {
    const uuid = randomUUID().slice(0, 8);
    this.sandboxPath = join(tmpdir(), `mini-ide-sandbox-${uuid}`);

    await mkdir(this.sandboxPath, { recursive: true });
    await mkdir(join(this.sandboxPath, "src"), { recursive: true });

    // Generate package.json with dependencies from stack
    const packageJson = this.generatePackageJson(stack);
    await writeFile(
      join(this.sandboxPath, "package.json"),
      JSON.stringify(packageJson, null, 2)
    );

    // Generate tsconfig.json
    const tsconfig = this.generateTsConfig(stack);
    await writeFile(
      join(this.sandboxPath, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2)
    );

    // Run npm install with timeout (may fail, that's OK)
    try {
      // eslint-disable-next-line no-console
      console.log(`[SandboxExecutor] Installing dependencies in ${this.sandboxPath}...`);
      await this.exec("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], 120000);
      // eslint-disable-next-line no-console
      console.log(`[SandboxExecutor] Dependencies installed successfully`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[SandboxExecutor] npm install failed (typecheck may still work for local files):`, error);
    }

    this.initialized = true;
  }

  /**
   * Writes a file to the sandbox, creating intermediate directories as needed
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.sandboxPath) {
      throw new Error("Sandbox not initialized. Call initialize() first.");
    }

    const fullPath = join(this.sandboxPath, filePath);
    const dir = dirname(fullPath);

    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  /**
   * Runs TypeScript type checking on all files in the sandbox
   */
  public async typecheck(): Promise<SandboxResult> {
    if (!this.sandboxPath) {
      throw new Error("Sandbox not initialized. Call initialize() first.");
    }

    return this.exec("npx", ["tsc", "--noEmit", "--pretty", "false"], 60000);
  }

  /**
   * Runs TypeScript type checking on a specific file
   */
  public async typecheckFile(filePath: string): Promise<SandboxResult> {
    if (!this.sandboxPath) {
      throw new Error("Sandbox not initialized. Call initialize() first.");
    }

    return this.exec("npx", ["tsc", "--noEmit", "--pretty", "false", filePath], 30000);
  }

  /**
   * Executes a command in the sandbox directory
   */
  public async exec(
    command: string,
    args: string[] = [],
    timeoutMs: number = 30000
  ): Promise<SandboxResult> {
    if (!this.sandboxPath) {
      throw new Error("Sandbox not initialized. Call initialize() first.");
    }

    const startTime = performance.now();

    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd: this.sandboxPath,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: "development"
        }
      });

      return {
        success: true,
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: 0,
        durationMs: performance.now() - startTime
      };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        code?: number | string;
        killed?: boolean;
      };

      return {
        success: false,
        stdout: execError.stdout || "",
        stderr: execError.stderr || String(error),
        exitCode: typeof execError.code === "number" ? execError.code : 1,
        durationMs: performance.now() - startTime
      };
    }
  }

  /**
   * Removes the sandbox directory and all its contents
   */
  public async cleanup(): Promise<void> {
    if (this.sandboxPath) {
      try {
        await rm(this.sandboxPath, { recursive: true, force: true });
        // eslint-disable-next-line no-console
        console.log(`[SandboxExecutor] Cleaned up ${this.sandboxPath}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`[SandboxExecutor] Failed to cleanup ${this.sandboxPath}:`, error);
      }
      this.sandboxPath = null;
      this.initialized = false;
    }
  }

  /**
   * Lists all files in the sandbox (for debugging)
   */
  public async listFiles(): Promise<string[]> {
    if (!this.sandboxPath) {
      return [];
    }

    const files: string[] = [];
    const walk = async (dir: string, prefix: string = ""): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory() && entry.name !== "node_modules") {
          await walk(join(dir, entry.name), relativePath);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    };

    await walk(this.sandboxPath);
    return files;
  }

  /**
   * Generates package.json based on tech stack
   */
  private generatePackageJson(stack: TechStack): Record<string, unknown> {
    const dependencies: Record<string, string> = {};
    const devDependencies: Record<string, string> = {
      typescript: "^5.3.0"
    };

    // Detect framework dependencies
    const framework = stack.framework?.toLowerCase() || "";
    const testing = stack.testing?.toLowerCase() || "";

    if (framework.includes("react")) {
      dependencies["react"] = "^18.2.0";
      dependencies["react-dom"] = "^18.2.0";
      devDependencies["@types/react"] = "^18.2.0";
      devDependencies["@types/react-dom"] = "^18.2.0";
    }

    if (framework.includes("framer") || framework.includes("motion")) {
      dependencies["framer-motion"] = "^11.0.0";
    }

    if (framework.includes("d3")) {
      dependencies["d3"] = "^7.8.0";
      devDependencies["@types/d3"] = "^7.4.0";
    }

    if (testing.includes("vitest")) {
      devDependencies["vitest"] = "^1.0.0";
    }

    if (testing.includes("jest")) {
      devDependencies["jest"] = "^29.0.0";
      devDependencies["@types/jest"] = "^29.0.0";
    }

    // Add Node.js types
    devDependencies["@types/node"] = "^20.0.0";

    return {
      name: "sandbox-project",
      version: "1.0.0",
      type: "module",
      private: true,
      dependencies,
      devDependencies
    };
  }

  /**
   * Generates tsconfig.json based on tech stack
   */
  private generateTsConfig(stack: TechStack): Record<string, unknown> {
    const framework = stack.framework?.toLowerCase() || "";
    const isReact = framework.includes("react");

    return {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        ...(isReact && { jsx: "react-jsx" })
      },
      include: ["src/**/*", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"]
    };
  }
}
