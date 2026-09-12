# Zed Language Server Smoke Test

This repository contains a project-local Zed configuration for the built
`@arc42/server` executable. Open the repository root as the Zed project so
`.zed/settings.json` is applied.

## Build and Launch

From the repository root, build the executable:

```bash
pnpm --filter @arc42/server build
```

The Zed configuration launches the resulting server with this exact command
from the project root:

```bash
node packages/server/dist/server.mjs
```

The server uses stdio for LSP communication. Do not launch it through a shell,
development watcher, or the TypeScript source entrypoint.

## Manual Fixture Workspace Checklist

Use `examples/bookstore-backend/` as the fixture workspace. In Zed, open the
repository root as the project after building, then open the fixture files
under that directory. Confirm the following:

- [ ] Open `01-introduction.arc42.md`, `05-building-blocks.arc42.md`, or another
      `*.arc42.md` file. Zed treats the file as Markdown and starts
      `arc42-language-server`.
- [ ] Introduce an invalid reference in an arc42 block, then wait for the
      language server to publish a diagnostic at the affected value. Restore
      the reference and confirm the diagnostic clears.
- [ ] Place the cursor inside an applicable arc42 block and request completion.
      Confirm that context-appropriate block fields or values are offered.
- [ ] Edit an open document, including an edit containing non-ASCII text, and
      confirm diagnostics update without stale results.
- [ ] Close and reopen the file, then confirm diagnostics and completion still
      work.

## Limitations

- This is a manual Zed smoke test, not an automated Zed integration test.
- The configuration assumes Zed starts the language server with the repository
  root as its working directory and that Node.js is available on `PATH`.
- The server currently provides diagnostics and context-aware completion only;
  formatting, code actions, rename, and other LSP features are not included.
- The fixture checklist does not assert exact diagnostic wording or completion
  ordering; those contracts are covered by the server test suite.
