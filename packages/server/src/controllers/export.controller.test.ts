import { describe, it, expect } from "vitest";
import { validateZipEntryPath } from "./export.controller.js";

describe("validateZipEntryPath", () => {
  // ── Valid paths ─────────────────────────────────────────────────────
  it("accepts simple filename", () => {
    expect(validateZipEntryPath("file.txt")).toBe("file.txt");
  });

  it("accepts nested relative path", () => {
    expect(validateZipEntryPath("src/index.ts")).toBe("src/index.ts");
  });

  it("accepts deeply nested path", () => {
    expect(validateZipEntryPath("a/b/c/d/e.txt")).toBe("a/b/c/d/e.txt");
  });

  it("accepts filename with dots", () => {
    expect(validateZipEntryPath("file.test.spec.ts")).toBe("file.test.spec.ts");
  });

  it("accepts directory-like segment with dots", () => {
    expect(validateZipEntryPath("src/.hidden/file.txt")).not.toBeNull();
  });

  // ── Empty / falsy paths ─────────────────────────────────────────────
  it("rejects empty string", () => {
    expect(validateZipEntryPath("")).toBeNull();
  });

  // ── Path traversal ──────────────────────────────────────────────────
  it("rejects ../ at start", () => {
    expect(validateZipEntryPath("../../etc/passwd")).toBeNull();
  });

  it("rejects .. segment in middle", () => {
    expect(validateZipEntryPath("a/../b.txt")).toBeNull();
  });

  it("rejects lone ..", () => {
    expect(validateZipEntryPath("..")).toBeNull();
  });

  it("rejects dot segment ./", () => {
    expect(validateZipEntryPath("./file.txt")).toBeNull();
  });

  it("rejects lone .", () => {
    expect(validateZipEntryPath(".")).toBeNull();
  });

  // ── Backslash (Windows separator) ───────────────────────────────────
  it("rejects backslash traversal", () => {
    expect(validateZipEntryPath("..\\evil.txt")).toBeNull();
  });

  it("rejects backslash in middle", () => {
    expect(validateZipEntryPath("src\\file.txt")).toBeNull();
  });

  // ── Absolute paths ─────────────────────────────────────────────────
  it("rejects POSIX absolute path", () => {
    expect(validateZipEntryPath("/etc/passwd")).toBeNull();
  });

  it("rejects Windows drive letter C:/", () => {
    expect(validateZipEntryPath("C:/Windows/evil.txt")).toBeNull();
  });

  it("rejects Windows drive letter D:file", () => {
    expect(validateZipEntryPath("D:file.txt")).toBeNull();
  });

  it("rejects lowercase drive letter", () => {
    expect(validateZipEntryPath("c:/file.txt")).toBeNull();
  });

  // ── Null byte ──────────────────────────────────────────────────────
  it("rejects path with null byte", () => {
    expect(validateZipEntryPath("safe.txt\0../../evil")).toBeNull();
  });

  it("rejects null byte at start", () => {
    expect(validateZipEntryPath("\0file.txt")).toBeNull();
  });

  // ── Structural issues ──────────────────────────────────────────────
  it("rejects double slash (empty segment)", () => {
    expect(validateZipEntryPath("src//file.txt")).toBeNull();
  });

  it("rejects trailing slash", () => {
    expect(validateZipEntryPath("src/folder/")).toBeNull();
  });
});
