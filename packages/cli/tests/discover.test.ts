import { expect, test, describe } from "vite-plus/test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverArc42Dir } from "../src/discover.ts";

function makeTmpDir(name: string): string {
  const dir = join(tmpdir(), `arc42-discover-test-${name}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("discoverArc42Dir — walk-up", () => {
  test("returns cwd when arc42 files are in cwd", () => {
    const dir = makeTmpDir("cwd");
    try {
      writeFileSync(join(dir, "building-blocks.arc42.md"), "");
      expect(discoverArc42Dir(dir)).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("returns parent when arc42 files are one level up", () => {
    const parent = makeTmpDir("parent");
    const child = join(parent, "subdir");
    mkdirSync(child);
    try {
      writeFileSync(join(parent, "building-blocks.arc42.md"), "");
      expect(discoverArc42Dir(child)).toBe(parent);
    } finally {
      rmSync(parent, { recursive: true });
    }
  });

  test("returns grandparent when arc42 files are two levels up", () => {
    const root = makeTmpDir("grandparent");
    const child = join(root, "a", "b");
    mkdirSync(child, { recursive: true });
    try {
      writeFileSync(join(root, "decisions.arc42.md"), "");
      expect(discoverArc42Dir(child)).toBe(root);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("returns undefined when no arc42 files exist anywhere in the subtree", () => {
    const dir = makeTmpDir("empty");
    const child = join(dir, "deep", "path");
    mkdirSync(child, { recursive: true });
    try {
      const result = discoverArc42Dir(child);
      expect(result === undefined || typeof result === "string").toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("ignores directories named *.arc42.*", () => {
    const dir = makeTmpDir("dir-match");
    const child = join(dir, "sub");
    mkdirSync(child);
    try {
      mkdirSync(join(dir, "not-a-file.arc42.md"));
      expect(discoverArc42Dir(child)).not.toBe(dir);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe("discoverArc42Dir — subdir discovery", () => {
  test("finds arc42 files in a single immediate subdir", () => {
    const root = makeTmpDir("subdir-single");
    const docs = join(root, "docs");
    mkdirSync(docs);
    try {
      writeFileSync(join(docs, "building-blocks.arc42.md"), "");
      expect(discoverArc42Dir(root)).toBe(docs);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("returns first match and warns when multiple subdirs contain arc42 files", () => {
    const root = makeTmpDir("subdir-multi");
    const docsA = join(root, "a-docs");
    const docsB = join(root, "b-docs");
    mkdirSync(docsA);
    mkdirSync(docsB);
    try {
      writeFileSync(join(docsA, "building-blocks.arc42.md"), "");
      writeFileSync(join(docsB, "decisions.arc42.md"), "");
      const warnings: string[] = [];
      const result = discoverArc42Dir(root, (msg) => warnings.push(msg));
      expect(result).toBe(docsA);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("multiple directories");
      expect(warnings[0]).toContain("--dir");
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("does not warn when exactly one subdir matches", () => {
    const root = makeTmpDir("subdir-no-warn");
    const docs = join(root, "docs");
    mkdirSync(docs);
    try {
      writeFileSync(join(docs, "building-blocks.arc42.md"), "");
      const warnings: string[] = [];
      discoverArc42Dir(root, (msg) => warnings.push(msg));
      expect(warnings).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("prefers current dir over subdir when both have arc42 files", () => {
    const root = makeTmpDir("subdir-prefer-current");
    const docs = join(root, "docs");
    mkdirSync(docs);
    try {
      writeFileSync(join(root, "building-blocks.arc42.md"), "");
      writeFileSync(join(docs, "decisions.arc42.md"), "");
      const warnings: string[] = [];
      const result = discoverArc42Dir(root, (msg) => warnings.push(msg));
      expect(result).toBe(root);
      expect(warnings).toHaveLength(0);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("prefers 'docs' subdir over other subdirs when multiple match", () => {
    const root = makeTmpDir("prefer-docs");
    const docs = join(root, "docs");
    const other = join(root, "aaa-other"); // alphabetically before "docs"
    mkdirSync(docs);
    mkdirSync(other);
    try {
      writeFileSync(join(docs, "building-blocks.arc42.md"), "");
      writeFileSync(join(other, "decisions.arc42.md"), "");
      const warnings: string[] = [];
      const result = discoverArc42Dir(root, (msg) => warnings.push(msg));
      expect(result).toBe(docs);
      expect(warnings).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true });
    }
  });

  test("prefers 'arc42' subdir over other subdirs when multiple match", () => {
    const root = makeTmpDir("prefer-arc42");
    const arc42 = join(root, "arc42");
    const other = join(root, "aaa-other");
    mkdirSync(arc42);
    mkdirSync(other);
    try {
      writeFileSync(join(arc42, "building-blocks.arc42.md"), "");
      writeFileSync(join(other, "decisions.arc42.md"), "");
      const warnings: string[] = [];
      const result = discoverArc42Dir(root, (msg) => warnings.push(msg));
      expect(result).toBe(arc42);
      expect(warnings).toHaveLength(1);
    } finally {
      rmSync(root, { recursive: true });
    }
  });
});
