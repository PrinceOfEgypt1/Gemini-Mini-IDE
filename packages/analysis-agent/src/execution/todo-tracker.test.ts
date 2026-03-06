import { describe, it, expect, beforeEach } from "vitest";
import { TodoTracker } from "./todo-tracker.js";
import type { RichManifestItem } from "../types/rich-schemas.js";

describe("TodoTracker", () => {
  let tracker: TodoTracker;

  const mockManifest: RichManifestItem[] = [
    { path: "src/types/index.ts", purpose: "Type definitions", category: "DOMAIN", criticality: "HIGH" },
    { path: "src/domain/Array.ts", purpose: "Array implementation", category: "DOMAIN", criticality: "HIGH" },
    { path: "src/domain/BST.ts", purpose: "Binary Search Tree", category: "DOMAIN", criticality: "HIGH" },
    { path: "src/domain/Graph.ts", purpose: "Graph implementation", category: "DOMAIN", criticality: "MEDIUM" },
    { path: "src/utils/helpers.ts", purpose: "Helper functions", category: "APPLICATION", criticality: "LOW" }
  ];

  beforeEach(() => {
    tracker = new TodoTracker();
  });

  describe("initFromManifest", () => {
    it("should initialize with all items as pending", () => {
      tracker.initFromManifest(mockManifest);

      expect(tracker.totalCount).toBe(5);
      expect(tracker.pendingItems.length).toBe(5);
      expect(tracker.completedCount).toBe(0);
    });

    it("should clear previous state on re-init", () => {
      tracker.initFromManifest(mockManifest);
      tracker.complete("src/types/index.ts");

      tracker.initFromManifest(mockManifest);

      expect(tracker.completedCount).toBe(0);
    });
  });

  describe("status transitions", () => {
    beforeEach(() => {
      tracker.initFromManifest(mockManifest);
    });

    it("should mark item as in_progress", () => {
      tracker.setInProgress("src/types/index.ts");

      const item = tracker.getItem("src/types/index.ts");
      expect(item?.status).toBe("in_progress");
      expect(tracker.inProgressItems.length).toBe(1);
    });

    it("should mark item as completed", () => {
      tracker.complete("src/types/index.ts");

      const item = tracker.getItem("src/types/index.ts");
      expect(item?.status).toBe("completed");
      expect(item?.completedAt).toBeDefined();
      expect(tracker.completedCount).toBe(1);
    });

    it("should mark item as failed with reason", () => {
      tracker.fail("src/utils/helpers.ts", "Import circular detectado");

      const item = tracker.getItem("src/utils/helpers.ts");
      expect(item?.status).toBe("failed");
      expect(item?.failReason).toBe("Import circular detectado");
      expect(tracker.failedItems.length).toBe(1);
    });
  });

  describe("progressPercent", () => {
    beforeEach(() => {
      tracker.initFromManifest(mockManifest);
    });

    it("should return 0% initially", () => {
      expect(tracker.progressPercent).toBe(0);
    });

    it("should calculate correct percentage", () => {
      tracker.complete("src/types/index.ts");
      tracker.complete("src/domain/Array.ts");

      expect(tracker.progressPercent).toBe(40); // 2/5 = 40%
    });

    it("should return 100% when all completed", () => {
      for (const item of mockManifest) {
        tracker.complete(item.path);
      }

      expect(tracker.progressPercent).toBe(100);
    });
  });

  describe("toContextString", () => {
    beforeEach(() => {
      tracker.initFromManifest(mockManifest);
    });

    it("should include progress header", () => {
      const context = tracker.toContextString();

      expect(context).toContain("PROGRESSO: 0/5 arquivos (0.0%)");
    });

    it("should show completed items with checkmark", () => {
      tracker.complete("src/types/index.ts");

      const context = tracker.toContextString();

      expect(context).toContain("✅ src/types/index.ts");
    });

    it("should show in-progress item with arrow", () => {
      tracker.setInProgress("src/domain/Array.ts");

      const context = tracker.toContextString();

      expect(context).toContain("🔄 src/domain/Array.ts ← GERANDO AGORA");
    });

    it("should show pending items with empty box", () => {
      const context = tracker.toContextString();

      expect(context).toContain("⬜ src/types/index.ts");
    });

    it("should show failed items with X and reason", () => {
      tracker.fail("src/utils/helpers.ts", "Import circular");

      const context = tracker.toContextString();

      expect(context).toContain("❌ src/utils/helpers.ts — Erro: Import circular");
    });

    it("should limit pending items to 5", () => {
      const largeManifest: RichManifestItem[] = Array.from({ length: 20 }, (_, i) => ({
        path: `src/file${i}.ts`,
        purpose: `File ${i}`,
        category: "APPLICATION" as const,
        criticality: "MEDIUM" as const
      }));

      tracker.initFromManifest(largeManifest);

      const context = tracker.toContextString();

      expect(context).toContain("... e mais 15 arquivos pendentes");
    });

    it("should only show last 5 completed items", () => {
      const largeManifest: RichManifestItem[] = Array.from({ length: 10 }, (_, i) => ({
        path: `src/file${i}.ts`,
        purpose: `File ${i}`,
        category: "APPLICATION" as const,
        criticality: "MEDIUM" as const
      }));

      tracker.initFromManifest(largeManifest);

      // Complete all 10
      for (let i = 0; i < 10; i++) {
        tracker.complete(`src/file${i}.ts`);
      }

      const context = tracker.toContextString();

      // Should show last 5 (file5-file9)
      expect(context).toContain("✅ src/file9.ts");
      expect(context).toContain("✅ src/file5.ts");
      // file0 should not be shown (too old)
      expect(context.match(/✅ src\/file0\.ts/)).toBeNull();
    });
  });

  describe("isComplete", () => {
    beforeEach(() => {
      tracker.initFromManifest(mockManifest);
    });

    it("should return false when items pending", () => {
      expect(tracker.isComplete).toBe(false);
    });

    it("should return false when items in progress", () => {
      tracker.setInProgress("src/types/index.ts");
      expect(tracker.isComplete).toBe(false);
    });

    it("should return true when all completed", () => {
      for (const item of mockManifest) {
        tracker.complete(item.path);
      }
      expect(tracker.isComplete).toBe(true);
    });

    it("should return true when all completed or failed", () => {
      tracker.complete("src/types/index.ts");
      tracker.complete("src/domain/Array.ts");
      tracker.complete("src/domain/BST.ts");
      tracker.complete("src/domain/Graph.ts");
      tracker.fail("src/utils/helpers.ts", "Error");

      expect(tracker.isComplete).toBe(true);
    });
  });

  describe("getSummary", () => {
    beforeEach(() => {
      tracker.initFromManifest(mockManifest);
    });

    it("should return correct summary", () => {
      tracker.complete("src/types/index.ts");
      tracker.setInProgress("src/domain/Array.ts");
      tracker.fail("src/utils/helpers.ts", "Error");

      const summary = tracker.getSummary();

      expect(summary.completed).toBe(1);
      expect(summary.pending).toBe(2);
      expect(summary.inProgress).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.total).toBe(5);
      expect(summary.percent).toBe(20);
    });
  });
});
