import type { BlockNode, DocumentAst, HeadingNode, ProseNode } from "./ast.ts";

export interface LineRange {
  start: number;
  end: number;
}

export interface FileChange {
  filePath: string;
  oldRanges: LineRange[];
  newRanges: LineRange[];
}

export interface DiffFinding {
  kind: "block-without-prose-change" | "prose-without-block-change" | "implementation-path";
  severity: "warning" | "hint";
  file: string;
  line: number;
  message: string;
  elementId?: string;
}

export interface DiffResult {
  consistencyFindings: DiffFinding[];
  pathFindings: DiffFinding[];
  affectedRanges: FileChange[];
  affectedFiles: string[];
  hasBlockingFindings: boolean;
}

export interface AnalyzeDiffOptions {
  changes: FileChange[];
  current: DocumentAst[];
  base?: DocumentAst[];
  knownPaths?: Set<string>;
}

interface Section {
  key: string;
  heading?: HeadingNode;
  endLine: number;
  prose: ProseNode[];
  blocks: BlockNode[];
}

function contains(range: LineRange, start: number, end: number): boolean {
  // A zero-line insertion is represented by start > end. Treat it as a point
  // between lines so insertions immediately before/after a node are visible.
  if (range.end < range.start) return range.start >= start && range.start <= end + 1;
  return range.start <= end && range.end >= start;
}

function changed(ranges: LineRange[], start: number, end = start): boolean {
  return ranges.some((range) => contains(range, start, end));
}

function sections(document: DocumentAst): Section[] {
  const headings = document.nodes.filter((node): node is HeadingNode => node.kind === "heading");
  const startLine = (node: DocumentAst["nodes"][number]): number =>
    node.kind === "block" || node.kind === "diagram" || node.kind === "bare-mermaid"
      ? node.startLine
      : node.line;
  return headings.map((heading, index) => {
    const nextHeading = headings[index + 1];
    const sectionNodes = document.nodes.filter(
      (node) =>
        node.kind !== "heading" &&
        node.kind !== "diagram" &&
        node.kind !== "bare-mermaid" &&
        startLine(node) >= heading.line &&
        (!nextHeading || startLine(node) < nextHeading.line),
    );
    return {
      key: `${document.filePath}:${heading.line}`,
      heading,
      endLine: nextHeading ? nextHeading.line - 1 : Number.MAX_SAFE_INTEGER,
      prose: sectionNodes.filter((node): node is ProseNode => node.kind === "prose"),
      blocks: sectionNodes.filter((node): node is BlockNode => node.kind === "block"),
    };
  });
}

function sectionForBlock(document: DocumentAst, block: BlockNode): Section {
  const all = sections(document);
  return (
    all.find(
      (section) =>
        section.heading &&
        section.heading.line <= block.startLine &&
        block.startLine <= section.endLine,
    ) ?? {
      key: `${document.filePath}:0`,
      endLine: Number.MAX_SAFE_INTEGER,
      prose: document.nodes.filter((node): node is ProseNode => node.kind === "prose"),
      blocks: [block],
    }
  );
}

function changedBlock(block: BlockNode, ranges: LineRange[]): boolean {
  return changed(ranges, block.startLine, block.endLine);
}

function changedSectionProse(section: Section, ranges: LineRange[]): boolean {
  if (section.heading && changed(ranges, section.heading.line)) return true;
  return section.prose.some((node) => changed(ranges, node.line));
}

function consistencyFindingsForDeletedBlocks(
  document: DocumentAst,
  change: FileChange,
  currentKeys: Set<string>,
): DiffFinding[] {
  const findings: DiffFinding[] = [];
  for (const block of document.nodes.filter((node): node is BlockNode => node.kind === "block")) {
    const key = `${block.blockType}:${block.attributes.id ?? block.startLine}`;
    if (currentKeys.has(key) || !changedBlock(block, change.oldRanges)) continue;
    const section = sectionForBlock(document, block);
    if (!changedSectionProse(section, change.oldRanges)) {
      findings.push({
        kind: "block-without-prose-change",
        severity: "warning",
        file: document.filePath,
        line: block.startLine,
        elementId: block.attributes.id,
        message: `Block '${block.attributes.id ?? block.blockType}' was deleted without deleting its section prose.`,
      });
    }
  }
  return findings;
}

function consistencyFindingsForDeletedProse(
  oldDocument: DocumentAst,
  currentDocument: DocumentAst,
  change: FileChange,
): DiffFinding[] {
  const findings: DiffFinding[] = [];
  const oldBlocks = oldDocument.nodes.filter((node): node is BlockNode => node.kind === "block");
  const currentBlocks = currentDocument.nodes.filter(
    (node): node is BlockNode => node.kind === "block",
  );
  for (const block of currentBlocks) {
    const oldBlock = oldBlocks.find(
      (candidate) =>
        candidate.blockType === block.blockType && candidate.attributes.id === block.attributes.id,
    );
    if (!oldBlock || changedBlock(block, change.newRanges)) continue;
    if (changedSectionProse(sectionForBlock(oldDocument, oldBlock), change.oldRanges)) {
      findings.push({
        kind: "prose-without-block-change",
        severity: "warning",
        file: currentDocument.filePath,
        line: block.startLine,
        elementId: block.attributes.id,
        message: `Section prose changed without changing block '${block.attributes.id ?? block.blockType}'.`,
      });
    }
  }
  return findings;
}

function pathParts(value: string): string[] | undefined {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes(".."))
    return undefined;
  return normalized.split("/").filter(Boolean);
}

function pathMatches(modeled: string, changedPath: string, knownPaths?: Set<string>): boolean {
  const expected = pathParts(modeled);
  const actual = pathParts(changedPath);
  if (!expected || !actual || actual.length < expected.length) return false;
  if (knownPaths) {
    const authored = expected.join("/");
    const isFile = knownPaths.has(authored);
    const isDirectory = [...knownPaths].some((candidate) => candidate.startsWith(`${authored}/`));
    if (!isFile && !isDirectory) return false;
    if (isFile && actual.length !== expected.length) return false;
  }
  return expected.every((part, index) => part === actual[index]);
}

function pathFindings(
  changes: FileChange[],
  documents: DocumentAst[],
  knownPaths?: Set<string>,
): DiffFinding[] {
  const result: DiffFinding[] = [];
  const seen = new Set<string>();
  for (const document of documents) {
    for (const node of document.nodes) {
      if (node.kind !== "block" || !["building-block", "interface"].includes(node.blockType))
        continue;
      const path = node.attributes.path;
      const id = node.attributes.id ?? node.blockType;
      if (!path) continue;
      for (const change of changes) {
        if (!pathMatches(path, change.filePath, knownPaths)) continue;
        const key = `${id}:${change.filePath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          kind: "implementation-path",
          severity: "hint",
          file: change.filePath,
          line: change.newRanges[0]?.start ?? 1,
          elementId: id,
          message: `${change.filePath} changed; review architecture element '${id}' (${path}).`,
        });
      }
    }
  }
  return result;
}

function consistencyFindingsForDocument(document: DocumentAst, change: FileChange): DiffFinding[] {
  const findings: DiffFinding[] = [];
  const currentSections = sections(document);
  const currentBlocks = document.nodes.filter((node): node is BlockNode => node.kind === "block");
  for (const block of currentBlocks) {
    const section = sectionForBlock(document, block);
    const blockChanged = changedBlock(block, change.newRanges);
    const proseChanged = changedSectionProse(section, change.newRanges);
    if (blockChanged && !proseChanged) {
      findings.push({
        kind: "block-without-prose-change",
        severity: "warning",
        file: document.filePath,
        line: block.startLine,
        elementId: block.attributes.id,
        message: `Block '${block.attributes.id ?? block.blockType}' changed without changing its section prose.`,
      });
    } else if (!blockChanged && proseChanged) {
      findings.push({
        kind: "prose-without-block-change",
        severity: "warning",
        file: document.filePath,
        line: block.startLine,
        elementId: block.attributes.id,
        message: `Section prose changed without changing block '${block.attributes.id ?? block.blockType}'.`,
      });
    }
  }
  // A section with prose but no current block is not paired. This also keeps
  // documents containing only prose outside the consistency contract.
  void currentSections;
  return findings;
}

export function analyzeArchitectureDiff(options: AnalyzeDiffOptions): DiffResult {
  const consistency: DiffFinding[] = [];
  const currentByFile = new Map(options.current.map((document) => [document.filePath, document]));
  const baseByFile = new Map(options.base?.map((document) => [document.filePath, document]) ?? []);
  for (const change of options.changes) {
    const document = currentByFile.get(change.filePath);
    if (document) consistency.push(...consistencyFindingsForDocument(document, change));
    const oldDocument = baseByFile.get(change.filePath);
    if (oldDocument) {
      const currentKeys = new Set(
        document?.nodes
          .filter((node): node is BlockNode => node.kind === "block")
          .map((block) => `${block.blockType}:${block.attributes.id ?? block.startLine}`) ?? [],
      );
      consistency.push(...consistencyFindingsForDeletedBlocks(oldDocument, change, currentKeys));
      if (document)
        consistency.push(...consistencyFindingsForDeletedProse(oldDocument, document, change));
    }
  }
  const uniqueConsistency = [
    ...new Map(
      consistency.map((finding) => [`${finding.kind}:${finding.file}:${finding.line}`, finding]),
    ).values(),
  ];
  uniqueConsistency.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind),
  );
  const paths = pathFindings(
    options.changes,
    [...options.current, ...(options.base ?? [])],
    options.knownPaths,
  );
  paths.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      (a.elementId ?? "").localeCompare(b.elementId ?? ""),
  );
  const affectedFiles = new Set<string>(paths.map((finding) => finding.file));
  const relevantChanges: FileChange[] = [];
  for (const change of options.changes) {
    const current = currentByFile.get(change.filePath);
    const old = baseByFile.get(change.filePath);
    const affected = [current, old].some((document) => {
      if (!document) return false;
      return document.nodes
        .filter((node): node is BlockNode => node.kind === "block")
        .some(
          (block) =>
            changedBlock(block, change.newRanges) ||
            changedBlock(block, change.oldRanges) ||
            changedSectionProse(sectionForBlock(document, block), change.newRanges) ||
            changedSectionProse(sectionForBlock(document, block), change.oldRanges),
        );
    });
    if (affected) affectedFiles.add(change.filePath);
    const relevantNewRanges = change.newRanges.filter((range) => {
      return [current, old].some((document) => {
        if (!document) return false;
        return document.nodes
          .filter((node): node is BlockNode => node.kind === "block")
          .some(
            (block) =>
              contains(range, block.startLine, block.endLine) ||
              changedSectionProse(sectionForBlock(document, block), [range]),
          );
      });
    });
    const relevantOldRanges = change.oldRanges.filter((range) => {
      return [current, old].some((document) => {
        if (!document) return false;
        return document.nodes
          .filter((node): node is BlockNode => node.kind === "block")
          .some(
            (block) =>
              contains(range, block.startLine, block.endLine) ||
              changedSectionProse(sectionForBlock(document, block), [range]),
          );
      });
    });
    if (relevantNewRanges.length > 0 || relevantOldRanges.length > 0) {
      relevantChanges.push({
        ...change,
        newRanges: relevantNewRanges,
        oldRanges: relevantOldRanges,
      });
    }
  }
  return {
    consistencyFindings: uniqueConsistency,
    pathFindings: paths,
    affectedRanges: relevantChanges,
    affectedFiles: [...affectedFiles].sort(),
    hasBlockingFindings: uniqueConsistency.length > 0,
  };
}
