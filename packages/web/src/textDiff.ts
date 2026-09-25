/** One run of a token diff: kept in both, only in the old value, or only in the new one. */
export interface DiffPart<T> {
  op: "equal" | "delete" | "insert";
  values: T[];
}

function push<T>(parts: DiffPart<T>[], op: DiffPart<T>["op"], value: T) {
  const last = parts[parts.length - 1];
  if (last?.op === op) last.values.push(value);
  else parts.push({ op, values: [value] });
}

/**
 * Longest-common-subsequence diff of two token lists. Deletions come before
 * insertions within a changed run, so a replacement reads old → new.
 */
export function diffTokens<T>(before: readonly T[], after: readonly T[]): DiffPart<T>[] {
  // Common prefix and suffix need no table; attribute values usually differ in a small part.
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  const a = before.slice(start, endBefore);
  const b = after.slice(start, endAfter);
  const width = b.length + 1;
  // lengths[i * width + j] = LCS length of a[i..] and b[j..].
  const lengths = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i * width + j] =
        a[i] === b[j]
          ? lengths[(i + 1) * width + j + 1]! + 1
          : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
    }
  }

  const parts: DiffPart<T>[] = [];
  for (let k = 0; k < start; k++) push(parts, "equal", before[k]!);
  let i = 0;
  let j = 0;
  const deleted: T[] = [];
  const inserted: T[] = [];
  const flush = () => {
    for (const value of deleted.splice(0)) push(parts, "delete", value);
    for (const value of inserted.splice(0)) push(parts, "insert", value);
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      push(parts, "equal", a[i]!);
      i++;
      j++;
    } else if (
      j >= b.length ||
      (i < a.length && lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!)
    ) {
      deleted.push(a[i++]!);
    } else {
      inserted.push(b[j++]!);
    }
  }
  flush();
  for (let k = endBefore; k < before.length; k++) push(parts, "equal", before[k]!);
  return parts;
}

/** Split text into words, whitespace runs and single punctuation characters. */
export function wordTokens(text: string): string[] {
  return text.match(/[\p{L}\p{N}_-]+|\s+|[^\p{L}\p{N}_\s-]/gu) ?? [];
}
