/** Return the final component of a path without depending on a host platform. */
export function basename(path: string): string {
  return path.replaceAll("\\", "/").split("/").pop() ?? "";
}

/** Extract the arc42 chapter number from a numbered chapter filename. */
export function chapterNumberFromFile(path: string): number | null {
  const file = basename(path);
  if (!file.endsWith(".arc42.md")) return null;

  const match = /^(\d{2})-/.exec(file);
  if (!match) return null;

  const chapter = Number(match[1]);
  return chapter >= 1 && chapter <= 12 ? chapter : null;
}

/**
 * Normalise an implementation path to a comparable array of segments.
 * Strips leading `./`, normalises backslashes, and removes empty parts.
 */
export function normalizedPathSegments(value: string): string[] {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").split("/").filter(Boolean);
}
