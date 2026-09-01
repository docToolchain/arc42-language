import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWorkspace } from "../packages/core/src/arc42.ts";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const targets = ["docs/arc42", "examples/bookstore-backend"];

function formatDiagnostic(
  file: string,
  line: number,
  message: string,
  severity: string,
  code: string,
) {
  const displayFile = relative(repositoryRoot, file) || file;
  return `${severity} ${code}  ${displayFile}:${line}  ${message}`;
}

let failed = false;

for (const target of targets) {
  const directory = resolve(repositoryRoot, target);
  console.log(`Validating ${target} from TypeScript source...`);

  try {
    const result = await validateWorkspace({ dir: directory });
    for (const diagnostic of result.diagnostics) {
      console.log(
        formatDiagnostic(
          diagnostic.file,
          diagnostic.line,
          diagnostic.message,
          diagnostic.severity,
          diagnostic.code,
        ),
      );
    }

    const errors = result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "error",
    ).length;
    const warnings = result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "warning",
    ).length;
    const hints = result.diagnostics.filter((diagnostic) => diagnostic.severity === "hint").length;
    console.log(`${errors} errors, ${warnings} warnings, ${hints} hints`);

    if (!result.valid) failed = true;
  } catch (error) {
    console.error(`Failed to validate ${target}: ${String(error)}`);
    failed = true;
  }
}

process.exitCode = failed ? 1 : 0;
