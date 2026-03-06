/**
 * Execution module - Sandbox, VirtualFilesystem and TodoTracker
 *
 * This module provides the infrastructure for validating generated code:
 * - SandboxExecutor: Real TypeScript compilation in isolated directory
 * - VirtualFilesystem: In-memory file storage with export extraction
 * - TodoTracker: Progress tracking and attention mechanism
 */

export { SandboxExecutor } from "./sandbox-executor.js";
export type { SandboxResult } from "./sandbox-executor.js";

export { VirtualFilesystem } from "./virtual-filesystem.js";
export type {
  VirtualFile,
  FileMetadata,
  ExportInfo,
  VirtualFilesystemStats
} from "./virtual-filesystem.js";

export { TodoTracker } from "./todo-tracker.js";
export type { TodoItem, TodoStatus } from "./todo-tracker.js";
