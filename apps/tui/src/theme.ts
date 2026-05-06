import chalk, { type ChalkInstance } from 'chalk';

// ─── Type Colors ─────────────────────────────────────────────
// Each observation type has a distinct color for visual identification.

export const TYPE_COLORS: Record<string, ChalkInstance> = {
  decision: chalk.cyan,
  bug: chalk.red,
  discovery: chalk.green,
  note: chalk.yellow,
  summary: chalk.magenta,
  learning: chalk.blue,
};

export const TYPE_ICONS: Record<string, string> = {
  decision: '◆',
  bug: '✖',
  discovery: '●',
  note: '►',
  summary: '★',
  learning: '◈',
};

// ─── Semantic Colors ─────────────────────────────────────────

export const colors = {
  primary: chalk.blue,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  muted: chalk.gray,
  dim: chalk.dim,
  bold: chalk.bold,
  highlight: chalk.bgCyan.black,
  selected: chalk.inverse,
  border: chalk.gray,
  active: chalk.green,
  inactive: chalk.dim,
};

// ─── Layout Constants ────────────────────────────────────────

export const layout = {
  listWidthPercent: 60,
  detailWidthPercent: 40,
  pageSize: 20,
  maxTitleLength: 40,
  maxSnippetLength: 80,
  maxContentLines: 50,
  searchDebounceMs: 300,
};

// ─── Format Helpers ──────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

export function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
