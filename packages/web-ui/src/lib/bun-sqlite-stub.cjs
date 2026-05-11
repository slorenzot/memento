/**
 * Polyfill for bun:sqlite using better-sqlite3.
 *
 * bun:sqlite exposes: { Database }
 * better-sqlite3 exposes: Database (default export = constructor)
 *
 * This wrapper normalizes the exports so core's compiled CJS works:
 *   const bun_sqlite_1 = require("bun:sqlite");  → { Database: class }
 *   new bun_sqlite_1.Database(path)               → works
 */
const Database = require('better-sqlite3');

module.exports = { Database };
