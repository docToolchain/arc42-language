/** Return the final component of a path without depending on a host platform. */
export function basename(path: string): string {
  return path.replaceAll("\\", "/").split("/").pop() ?? "";
}
