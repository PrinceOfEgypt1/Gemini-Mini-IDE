import { describe, it, expect } from "vitest";
import { validateManifest } from "./manifest-validator.js";
import type { RichManifestItem } from "../types/rich-schemas.js";

function makeItem(overrides: Partial<RichManifestItem> & { path: string; category: RichManifestItem["category"] }): RichManifestItem {
  return {
    purpose: `Purpose for ${overrides.path}`,
    criticality: "HIGH",
    ...overrides,
  };
}

describe("validateManifest", () => {
  describe("empty / null manifest", () => {
    it("should return invalid for empty manifest", () => {
      const result = validateManifest([], "any prompt");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("EMPTY");
    });

    it("should return invalid for null-ish manifest", () => {
      const result = validateManifest(null as unknown as RichManifestItem[], "prompt");
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("empty");
    });
  });

  describe("structural validation", () => {
    it("should warn when item is missing purpose", () => {
      const result = validateManifest(
        [{ path: "package.json", purpose: "", category: "CONFIG", criticality: "HIGH" }],
        "prompt"
      );
      expect(result.warnings.some(w => w.includes("missing purpose"))).toBe(true);
    });

    it("should warn when item is missing category", () => {
      const result = validateManifest(
        [{ path: "file.ts", purpose: "test", category: "" as RichManifestItem["category"], criticality: "HIGH" }],
        "prompt"
      );
      expect(result.warnings.some(w => w.includes("missing category"))).toBe(true);
    });

    it("should error when item is missing path", () => {
      const result = validateManifest(
        [{ path: "", purpose: "test", category: "CONFIG", criticality: "HIGH" }],
        "prompt"
      );
      expect(result.errors.some(e => e.type === "MISSING_PATH")).toBe(true);
    });
  });

  describe("category distribution", () => {
    it("should be valid with CONFIG category present", () => {
      const manifest = [
        makeItem({ path: "package.json", category: "CONFIG" }),
        makeItem({ path: "src/app.ts", category: "APPLICATION" }),
        makeItem({ path: "README.md", category: "DOCS" }),
      ];
      const result = validateManifest(manifest, "prompt");
      expect(result.valid).toBe(true);
      expect(result.categoryDistribution).toBeDefined();
      expect(result.categoryDistribution!["CONFIG"]).toBe(1);
    });

    it("should be invalid when CONFIG is missing", () => {
      const manifest = [
        makeItem({ path: "src/app.ts", category: "APPLICATION" }),
        makeItem({ path: "README.md", category: "DOCS" }),
      ];
      const result = validateManifest(manifest, "prompt");
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("CONFIG"))).toBe(true);
    });

    it("should include distribution counts", () => {
      const manifest = [
        makeItem({ path: "package.json", category: "CONFIG" }),
        makeItem({ path: "tsconfig.json", category: "CONFIG" }),
        makeItem({ path: "src/a.ts", category: "APPLICATION" }),
      ];
      const result = validateManifest(manifest, "prompt");
      expect(result.categoryDistribution!["CONFIG"]).toBe(2);
      expect(result.categoryDistribution!["APPLICATION"]).toBe(1);
    });
  });

  describe("warnings propagation", () => {
    it("should propagate category warnings from categoryValidator", () => {
      const manifest = [
        makeItem({ path: "package.json", category: "CONFIG" }),
      ];
      const result = validateManifest(manifest, "prompt");
      // Missing DOCS and TESTS should produce warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should return no errors for well-structured manifest", () => {
      const manifest = [
        makeItem({ path: "package.json", category: "CONFIG" }),
        makeItem({ path: "README.md", category: "DOCS" }),
        makeItem({ path: "src/app.test.ts", category: "TESTS" }),
        makeItem({ path: "src/app.ts", category: "APPLICATION" }),
      ];
      const result = validateManifest(manifest, "prompt");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
