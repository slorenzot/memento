# CLI Package

`@slorenzot/memento-cli` — command-line interface for terminal-based memory management.

## Installation

```bash
bun add -g @slorenzot/memento-cli
```

## Binary

```bash
memento <command> [options]
```

## Architecture

Built on `@slorenzot/memento-core`, the CLI provides a thin command layer that maps CLI arguments to engine methods.

```
CLI (src/index.ts)
  ├── Commands → engine method calls
  ├── Output formatting → terminal-friendly display
  └── Global options → --project, --db, --help
```

## See Also

- [CLI Reference](/docs/cli/reference) — all commands and options
- [Core Package](/docs/packages/core) — underlying engine
