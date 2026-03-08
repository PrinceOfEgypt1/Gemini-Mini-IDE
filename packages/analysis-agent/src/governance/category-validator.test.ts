import { describe, it, expect } from "vitest";
import { CategoryValidator } from "./category-validator.js";
import type { RichManifestItem } from "../types/rich-schemas.js";

describe("CategoryValidator", () => {
  const validator = new CategoryValidator();

  const createManifest = (
    items: Array<{ path: string; category: RichManifestItem["category"] }>
  ): RichManifestItem[] =>
    items.map((item) => ({
      path: item.path,
      purpose: `Purpose for ${item.path}`,
      category: item.category,
      criticality: "HIGH",
    }));

  describe("Required categories", () => {
    it("should pass when CONFIG category is present", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "README.md", category: "DOCS" },
      ]);

      const result = validator.validate(manifest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail when CONFIG category is missing", () => {
      const manifest = createManifest([
        { path: "README.md", category: "DOCS" },
        { path: "src/App.tsx", category: "UI" },
      ]);

      const result = validator.validate(manifest);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("CONFIG"))).toBe(true);
    });
  });

  describe("Recommended categories (warnings only)", () => {
    it("should warn when DOCS category is missing", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/App.tsx", category: "UI" },
      ]);

      const result = validator.validate(manifest);

      expect(result.warnings.some((w) => w.includes("DOCS"))).toBe(true);
    });

    it("should warn when TESTS category is missing", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "README.md", category: "DOCS" },
      ]);

      const result = validator.validate(manifest);

      expect(result.warnings.some((w) => w.includes("TESTS"))).toBe(true);
    });

    it("should NOT warn when TESTS category is present", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "README.md", category: "DOCS" },
        { path: "src/app.test.ts", category: "TESTS" },
      ]);

      const result = validator.validate(manifest);

      expect(result.warnings.some((w) => w.includes("TESTS"))).toBe(false);
    });
  });

  describe("Code categories", () => {
    it("should warn when no code categories are present", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "README.md", category: "DOCS" },
      ]);

      const result = validator.validate(manifest);

      expect(
        result.warnings.some((w) => w.includes("No code categories"))
      ).toBe(true);
    });

    it("should NOT warn when at least one code category is present", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/domain/entity.ts", category: "DOMAIN" },
      ]);

      const result = validator.validate(manifest);

      expect(
        result.warnings.some((w) => w.includes("No code categories"))
      ).toBe(false);
    });
  });

  describe("Distribution validation", () => {
    it("should return correct distribution counts", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "tsconfig.json", category: "CONFIG" },
        { path: "README.md", category: "DOCS" },
        { path: "src/App.tsx", category: "UI" },
        { path: "src/Button.tsx", category: "UI" },
        { path: "src/Card.tsx", category: "UI" },
      ]);

      const result = validator.validate(manifest);

      expect(result.distribution["CONFIG"]).toBe(2);
      expect(result.distribution["DOCS"]).toBe(1);
      expect(result.distribution["UI"]).toBe(3);
    });
  });

  describe("Project type validation", () => {
    it("should warn frontend project without UI category", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/utils.ts", category: "APPLICATION" },
      ]);

      const result = validator.validateForProjectType(manifest, "frontend");

      expect(result.warnings.some((w) => w.includes("UI"))).toBe(true);
    });

    it("should warn backend project without INFRASTRUCTURE category", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/service.ts", category: "APPLICATION" },
      ]);

      const result = validator.validateForProjectType(manifest, "backend");

      expect(result.warnings.some((w) => w.includes("INFRASTRUCTURE"))).toBe(
        true
      );
    });

    it("should warn library project without DOMAIN category", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/index.ts", category: "APPLICATION" },
      ]);

      const result = validator.validateForProjectType(manifest, "library");

      expect(result.warnings.some((w) => w.includes("DOMAIN"))).toBe(true);
    });
  });

  describe("Generic behavior (NO overfitting)", () => {
    it("should NOT validate specific method counts", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/Stack.ts", category: "DOMAIN" },
      ]);

      const result = validator.validate(manifest);

      // Should not have any errors about method counts
      expect(
        result.errors.some(
          (e) => e.includes("methods") || e.includes("método")
        )
      ).toBe(false);
    });

    it("should NOT validate specific file counts per category", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
        { path: "src/app.ts", category: "APPLICATION" },
      ]);

      const result = validator.validate(manifest);

      // Only CONFIG should be required, not minimum counts
      expect(result.isValid).toBe(true);
    });

    it("should NOT reference data structures", () => {
      const manifest = createManifest([
        { path: "package.json", category: "CONFIG" },
      ]);

      const result = validator.validate(manifest);

      const allMessages = [...result.errors, ...result.warnings].join(" ");

      expect(allMessages.includes("Stack")).toBe(false);
      expect(allMessages.includes("Queue")).toBe(false);
      expect(allMessages.includes("Graph")).toBe(false);
      expect(allMessages.includes("Tree")).toBe(false);
      expect(allMessages.includes("visualization")).toBe(false);
    });
  });
});
