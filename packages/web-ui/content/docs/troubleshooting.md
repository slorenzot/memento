# Troubleshooting

## Database Issues

### "Database not initialized" error

**Cause:** The SQLite database file couldn't be created or opened.

**Solution:**
1. Check the directory exists and is writable
2. Verify the `MEMENTO_DB_PATH` environment variable points to a valid location
3. Check file permissions

```bash
# Check database path
memento status --section health

# Verify path is writable
touch ./data/memento.db
```

### "database is locked" error

**Cause:** Another process has an exclusive lock on the database.

**Solution:**
- WAL mode allows concurrent reads, but writes still need exclusive access
- Check for zombie processes using the database
- The `busy_timeout = 5000ms` PRAGMA should handle brief locks automatically

```bash
# Find processes using the database
lsof | grep memento.db
```

## MCP Issues

### MCP server not responding

**Cause:** The server process isn't running or isn't configured correctly.

**Solution:**
1. Verify the MCP server starts manually:

```bash
bun run mcp
# Should start without errors
```

2. Check your AI tool's MCP configuration:

```json
{
  "mcpServers": {
    "memento": {
      "command": "bun",
      "args": ["run", "--bun", "mcp"],
      "cwd": "/correct/path/to/memento"
    }
  }
}
```

3. Restart your AI tool after changing MCP config

### Tools not appearing

**Cause:** The MCP server is running but tools aren't registered.

**Solution:**
1. Check the server logs for errors during startup
2. Verify `@slorenzot/memento-core` is installed
3. Try running `memento status` to verify the engine works

## Search Issues

### Search returns no results

**Possible causes:**
1. No observations exist yet — save some first
2. FTS5 index is stale — restart the application
3. The query syntax is incorrect

**Solution:**
```bash
# Verify observations exist
memento status --section stats

# Try a simple query
memento search "test"

# Check specific project
memento search "test" --project my-app
```

### Semantic search not working

**Cause:** The embedding model hasn't been downloaded yet.

**Solution:**
- First semantic search triggers a model download (~23MB)
- Requires `@huggingface/transformers` as optional peer dependency
- Check network connectivity for the initial download

## Web UI Issues

### Build fails with `bun:sqlite` error

**Cause:** Next.js webpack doesn't support `bun:sqlite` natively.

**Solution:**
- The web-ui uses a `better-sqlite3` polyfill configured in `next.config.ts`
- Make sure `better-sqlite3` is installed: `bun add better-sqlite3`
- If issues persist, check the webpack externals configuration

### Dark mode not working

**Cause:** The `.dark` class isn't being applied to the `<html>` element.

**Solution:**
1. Check browser console for errors
2. Verify the theme toggle in settings works
3. Try manually adding `class="dark"` to `<html>` in DevTools

## Performance

### Slow search with many observations

**Solution:**
1. Use `type` and `project_id` filters to narrow results
2. Start with keyword search (fastest mode)
3. Only use semantic/hybrid when keyword doesn't find what you need
4. Consider merging duplicate observations

### Large database file

**Solution:**
1. Purge soft-deleted observations:

```bash
memento status --section config  # Check database size
```

2. Export and re-import to compact:

```bash
memento export --format json --output backup.json
# Delete old database
# Import fresh
memento import backup.json
```

## Getting Help

- Check the [FAQ](/docs/faq) for common questions
- Review [Core Concepts](/docs/core-concepts/observations) for usage patterns
- Open an issue on GitHub with reproduction steps
