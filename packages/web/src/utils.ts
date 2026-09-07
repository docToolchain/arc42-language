/** Return the filename portion of a path, without extension if arc42.md */
export function basename(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  const name = parts[parts.length - 1] ?? filePath;
  // Strip .arc42.md or just .md for display
  return name.replace(/\.arc42\.md$/, "").replace(/\.md$/, "");
}

/** Return the bare filename (last path segment, with extension) */
export function filename(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? filePath;
}

/**
 * Parse a Mermaid diagram aliases string into a map of alias → elementId.
 *
 * Input:  "gw=bb-api-gateway, cat=bb-catalog-service, cache=bb-cache"
 * Output: Map { "gw" => "bb-api-gateway", "cat" => "bb-catalog-service", "cache" => "bb-cache" }
 *
 * Entries that don't follow the `alias=elementId` pattern are silently skipped.
 */
export function parseAliases(aliases: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!aliases) return map;
  for (const entry of aliases.split(",")) {
    const eqIdx = entry.indexOf("=");
    if (eqIdx === -1) continue;
    const alias = entry.slice(0, eqIdx).trim();
    const elementId = entry.slice(eqIdx + 1).trim();
    if (alias && elementId) map.set(alias, elementId);
  }
  return map;
}
