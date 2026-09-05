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
