import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function discoverFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".arc42.md")) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

export { readFile };
