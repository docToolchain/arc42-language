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

const HTML_TOKEN = /<[^>]*>|&[#\w]+;|[\p{L}\p{N}_-]+|\s+|[^<&\p{L}\p{N}_\s-]+?/gu;

function isTag(token: string): boolean {
  return token.startsWith("<");
}

/** True when the tags of a run open and close in pairs, so it can stand on its own. */
function balanced(tokens: string[]): boolean {
  const open: string[] = [];
  for (const token of tokens) {
    const match = /^<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>$/.exec(token);
    if (!match || match[3] === "/" || /^(br|hr|img|wbr|input)$/i.test(match[2]!)) continue;
    if (match[1] === "") open.push(match[2]!.toLowerCase());
    else if (open.pop() !== match[2]!.toLowerCase()) return false;
  }
  return open.length === 0;
}

export interface HtmlMarks {
  /** Class of the `<ins>` around added text. */
  added: string;
  /** Class of the `<del>` around removed text. */
  removed: string;
}

/** Wrap the text tokens of a run in a mark; tags stay outside so the markup stays well-formed. */
function wrap(tokens: string[], tag: "ins" | "del", className: string): string {
  let html = "";
  let text = "";
  const flush = () => {
    if (text.trim() !== "") html += `<${tag} class="${className}">${text}</${tag}>`;
    else html += text;
    text = "";
  };
  for (const token of tokens) {
    if (isTag(token)) {
      flush();
      html += token;
    } else {
      text += token;
    }
  }
  flush();
  return html;
}

/** An unchanged run too small to read on its own between two changes (e.g. " the "). */
function isFiller(values: string[]): boolean {
  const words = values.filter((token) => token.trim() !== "");
  return words.length <= 1 && words.every((token) => !isTag(token) && token.length <= 3);
}

/**
 * Fold filler between changes into the change, so a rewritten sentence reads
 * as removed text followed by added text rather than interleaved fragments.
 */
function mergeChanges(parts: DiffPart<string>[]): DiffPart<string>[] {
  const merged: DiffPart<string>[] = [];
  let deleted: string[] = [];
  let inserted: string[] = [];
  const flush = () => {
    if (deleted.length > 0) merged.push({ op: "delete", values: deleted });
    if (inserted.length > 0) merged.push({ op: "insert", values: inserted });
    deleted = [];
    inserted = [];
  };
  parts.forEach((part, index) => {
    const between = index > 0 && index < parts.length - 1 && parts[index + 1]!.op !== "equal";
    if (part.op === "delete") deleted.push(...part.values);
    else if (part.op === "insert") inserted.push(...part.values);
    else if (between && (deleted.length > 0 || inserted.length > 0) && isFiller(part.values)) {
      deleted.push(...part.values);
      inserted.push(...part.values);
    } else {
      flush();
      merged.push(part);
    }
  });
  flush();
  return merged;
}

/**
 * Mark the words that changed between two versions of rendered prose. Returns
 * the head fragments with added text in `<ins>` and removed text in `<del>`
 * at the position it used to have. The head's own markup is kept; removed
 * markup survives only as whole balanced runs (e.g. a deleted paragraph).
 */
export function markHtmlChanges(base: string[], head: string[], marks: HtmlMarks): string[] {
  const baseTokens = base.flatMap((html) => html.match(HTML_TOKEN) ?? []);
  const headTokens: string[] = [];
  const owner: number[] = [];
  head.forEach((html, index) => {
    for (const token of html.match(HTML_TOKEN) ?? []) {
      headTokens.push(token);
      owner.push(index);
    }
  });
  const output = head.map(() => "");
  let position = 0;
  // Removed text belongs to the fragment of the next head token (or the last fragment).
  const target = () => owner[Math.min(position, owner.length - 1)] ?? 0;
  for (const part of mergeChanges(diffTokens(baseTokens, headTokens))) {
    if (part.op === "delete") {
      const tokens = balanced(part.values)
        ? part.values
        : part.values.filter((token) => !isTag(token));
      output[target()] += wrap(tokens, "del", marks.removed);
      continue;
    }
    // Equal and inserted tokens are head tokens; each goes to its own fragment.
    let run: string[] = [];
    let runOwner = owner[position] ?? 0;
    const flush = () => {
      output[runOwner] += part.op === "insert" ? wrap(run, "ins", marks.added) : run.join("");
      run = [];
    };
    for (const token of part.values) {
      if (owner[position] !== runOwner) {
        flush();
        runOwner = owner[position]!;
      }
      run.push(token);
      position++;
    }
    flush();
  }
  return output;
}
