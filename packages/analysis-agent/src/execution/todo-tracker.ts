import type { RichManifestItem } from "../types/rich-schemas.js";

/**
 * Status of a tracked item
 */
export type TodoStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * A tracked item in the todo list
 */
export interface TodoItem {
  path: string;
  status: TodoStatus;
  category?: string;
  purpose?: string;
  failReason?: string;
  completedAt?: number;
}

/**
 * TodoTracker - Attention mechanism for maintaining focus during long generations
 *
 * This component tracks progress through the manifest and generates
 * context strings that are injected into LLM prompts to maintain
 * awareness of global progress and pending work.
 *
 * @example
 * const tracker = new TodoTracker();
 * tracker.initFromManifest(manifest);
 * tracker.setInProgress("src/types.ts");
 * // ... LLM generates code ...
 * tracker.complete("src/types.ts");
 * console.log(tracker.toContextString());
 */
export class TodoTracker {
  private items = new Map<string, TodoItem>();
  private completionOrder: string[] = [];

  /**
   * Initializes the tracker from a manifest
   */
  public initFromManifest(manifest: RichManifestItem[]): void {
    this.items.clear();
    this.completionOrder = [];

    for (const item of manifest) {
      this.items.set(item.path, {
        path: item.path,
        status: "pending",
        category: item.category,
        purpose: item.purpose
      });
    }
  }

  /**
   * Marks an item as in progress
   */
  public setInProgress(path: string): void {
    const item = this.items.get(path);
    if (item) {
      item.status = "in_progress";
    }
  }

  /**
   * Marks an item as completed
   */
  public complete(path: string): void {
    const item = this.items.get(path);
    if (item) {
      item.status = "completed";
      item.completedAt = Date.now();
      this.completionOrder.push(path);
    }
  }

  /**
   * Marks an item as failed with reason
   */
  public fail(path: string, reason: string): void {
    const item = this.items.get(path);
    if (item) {
      item.status = "failed";
      item.failReason = reason;
    }
  }

  /**
   * Generates a context string for LLM injection
   */
  public toContextString(): string {
    const completed = this.completedCount;
    const total = this.totalCount;
    const percent = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";

    const lines: string[] = [];

    // Header with progress
    lines.push(`## PROGRESSO: ${completed}/${total} arquivos (${percent}%)`);
    lines.push("");

    // Recent completions (last 5)
    const recentCompleted = this.completionOrder
      .slice(-5)
      .map(path => this.items.get(path))
      .filter(Boolean) as TodoItem[];

    for (const item of recentCompleted) {
      lines.push(`✅ ${item.path}`);
    }

    // Current in progress
    const inProgress = Array.from(this.items.values())
      .filter(item => item.status === "in_progress");

    for (const item of inProgress) {
      lines.push(`🔄 ${item.path} ← GERANDO AGORA`);
    }

    // Next pending (up to 5)
    const pending = Array.from(this.items.values())
      .filter(item => item.status === "pending")
      .slice(0, 5);

    for (const item of pending) {
      lines.push(`⬜ ${item.path}`);
    }

    // Show remaining count if more pending
    const totalPending = this.pendingItems.length;
    if (totalPending > 5) {
      lines.push(`   ... e mais ${totalPending - 5} arquivos pendentes`);
    }

    // All failed items (always show)
    const failed = this.failedItems;
    for (const item of failed) {
      const reason = item.failReason
        ? ` — Erro: ${item.failReason.slice(0, 50)}`
        : "";
      lines.push(`❌ ${item.path}${reason}`);
    }

    return lines.join("\n");
  }

  /**
   * Returns the completion percentage
   */
  public get progressPercent(): number {
    const total = this.totalCount;
    if (total === 0) return 0;
    return (this.completedCount / total) * 100;
  }

  /**
   * Returns all pending items
   */
  public get pendingItems(): TodoItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === "pending");
  }

  /**
   * Returns all failed items
   */
  public get failedItems(): TodoItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === "failed");
  }

  /**
   * Returns all in-progress items
   */
  public get inProgressItems(): TodoItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === "in_progress");
  }

  /**
   * Returns all completed items
   */
  public get completedItems(): TodoItem[] {
    return Array.from(this.items.values())
      .filter(item => item.status === "completed");
  }

  /**
   * Returns the count of completed items
   */
  public get completedCount(): number {
    return this.completedItems.length;
  }

  /**
   * Returns the total count of items
   */
  public get totalCount(): number {
    return this.items.size;
  }

  /**
   * Returns item by path
   */
  public getItem(path: string): TodoItem | undefined {
    return this.items.get(path);
  }

  /**
   * Checks if all items are completed or failed
   */
  public get isComplete(): boolean {
    return this.pendingItems.length === 0 && this.inProgressItems.length === 0;
  }

  /**
   * Returns a summary of the current state
   */
  public getSummary(): {
    completed: number;
    pending: number;
    inProgress: number;
    failed: number;
    total: number;
    percent: number;
  } {
    return {
      completed: this.completedCount,
      pending: this.pendingItems.length,
      inProgress: this.inProgressItems.length,
      failed: this.failedItems.length,
      total: this.totalCount,
      percent: this.progressPercent
    };
  }
}
