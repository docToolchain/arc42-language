import { expect, test, describe } from "vite-plus/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkspace } from "../src/arc42.ts";

const fixtureDir = join(
  fileURLToPath(import.meta.url),
  "../../src/__fixtures__/mini-arch",
);

describe("validateWorkspace — mini-arch fixture", () => {
  test("returns all expected diagnostic codes", async () => {
    const result = await validateWorkspace({ dir: fixtureDir });

    const codes = result.diagnostics.map((d) => d.code);

    // E005: qg-security missing required 'priority'
    expect(codes).toContain("E005");

    // E002: bb-auth references non-existent parent 'bb-nonexistent'
    expect(codes).toContain("E002");

    // W002: bb-api and bb-db have no interface on either side
    expect(codes).toContain("W002");

    // H003: bb-auth has no technology
    expect(codes).toContain("H003");

    // H001: dec-auth-strategy has no 'addresses'
    expect(codes).toContain("H001");

    // W003: dec-auth-strategy is 'proposed' with date older than 90 days
    expect(codes).toContain("W003");

    // H002: qg-maintainability is not addressed by any decision
    expect(codes).toContain("H002");
  });

  test("result.valid is false when there are errors", async () => {
    const result = await validateWorkspace({ dir: fixtureDir });
    expect(result.valid).toBe(false);
  });

  test("diagnostics have required fields", async () => {
    const result = await validateWorkspace({ dir: fixtureDir });
    for (const d of result.diagnostics) {
      expect(d.code).toBeTruthy();
      expect(d.severity).toMatch(/^(error|warning|hint)$/);
      expect(d.message).toBeTruthy();
      expect(d.file).toBeTruthy();
      expect(typeof d.line).toBe("number");
    }
  });
});
