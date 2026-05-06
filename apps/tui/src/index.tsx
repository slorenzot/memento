#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './App.js';

// Resolve DB path from args or default
const args = process.argv.slice(2);
let dbPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--db' && args[i + 1]) {
    dbPath = args[i + 1];
    break;
  }
}

const { waitUntilExit } = render(<App dbPath={dbPath} />);

waitUntilExit().then((code) => {
  process.exit(code ?? 0);
});
