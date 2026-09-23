/**
 * Parses a .arc42ignore file into a set of glob-free path patterns.
 *
 * Syntax (subset of .gitignore):
 *   - Blank lines and lines starting with # are ignored
 *   - Each non-empty line is a path segment to exclude from H021 coverage checks
 *   - No glob expansion — exact top-level path names only (e.g. "scripts", ".vibe")
 */
export function parseArc42Ignore(content: string): Set<string> {
  const patterns = new Set<string>();
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    patterns.add(line);
  }
  return patterns;
}
