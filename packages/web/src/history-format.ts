/**
 * The architecture history format — the one of every *42 web view, from
 * `@cli42/lib/web`, with arc42's difference payload in its entries.
 */
import type { DiffPayload } from "@arc42/core/types";
import type { HistoryEntry as Entry } from "@cli42/lib/web";

export {
  HISTORY_CHUNK_SIZE,
  HISTORY_INDEX_FILE,
  historyChunkFile,
  historyChunkOf,
  parseJsonLines,
  sharePathLists,
  snapshotBlobFile,
  snapshotBlobOf,
  snapshotTreeFile,
  snapshotTreeOf,
  toHistoryPearls,
  toJsonLines,
} from "@cli42/lib/web";
export type { HistoryPearl, SnapshotTree } from "@cli42/lib/web";

/** The entry of one pearl, with arc42's difference. */
export type HistoryEntry = Entry<DiffPayload>;
