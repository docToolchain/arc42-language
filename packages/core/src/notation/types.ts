// Notation types — browser-safe, no Node.js imports.

import type { NotationAdapter as GenericNotationAdapter } from "@cli42/lib/notation";
import type { DocumentAst } from "../ast.ts";

export type Notation = "markdown" | "asciidoc";

/**
 * Encapsulates all notation-specific behavior for a workspace.
 * Selected once at discovery time and flows through the processing pipeline.
 * Adding a third notation means implementing this interface — no scattered if-branches.
 */
export type NotationAdapter = GenericNotationAdapter<Notation, DocumentAst>;
