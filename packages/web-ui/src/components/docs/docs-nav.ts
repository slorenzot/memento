/**
 * docs-nav.ts — Documentation navigation tree.
 *
 * Defines the sidebar structure for the /docs section.
 * Each entry maps to a markdown file in content/docs/.
 */

export interface DocNavItem {
  title: string;
  slug?: string; // relative to /docs — maps to content/docs/{slug}.md
  icon?: string;
  children?: DocNavItem[];
}

export const docsNav: DocNavItem[] = [
  {
    title: 'Quickstart',
    slug: 'quickstart',
  },
  {
    title: 'Core Concepts',
    children: [
      { title: 'Observations', slug: 'core-concepts/observations' },
      { title: 'Sessions', slug: 'core-concepts/sessions' },
      { title: 'Projects', slug: 'core-concepts/projects' },
      { title: 'Journal', slug: 'core-concepts/journal' },
      { title: 'Search', slug: 'core-concepts/search' },
    ],
  },
  {
    title: 'Capabilities',
    children: [
      { title: 'Context Recovery', slug: 'capabilities/context-recovery' },
      { title: 'Passive Capture', slug: 'capabilities/passive-capture' },
      { title: 'Export & Import', slug: 'capabilities/export-import' },
      { title: 'Merge', slug: 'capabilities/merge' },
      { title: 'Pin & Lock', slug: 'capabilities/pin-lock' },
    ],
  },
  {
    title: 'MCP Tools',
    children: [
      { title: 'Introduction', slug: 'mcp/introduction' },
      { title: 'Tools Reference', slug: 'mcp/tools-reference' },
    ],
  },
  {
    title: 'CLI',
    children: [
      { title: 'Reference', slug: 'cli/reference' },
    ],
  },
  {
    title: 'API',
    children: [
      { title: 'Introduction', slug: 'api/introduction' },
      { title: 'Observations', slug: 'api/observations' },
      { title: 'Sessions', slug: 'api/sessions' },
      { title: 'Search', slug: 'api/search' },
    ],
  },
  {
    title: 'Packages',
    children: [
      { title: 'Core', slug: 'packages/core' },
      { title: 'MCP Server', slug: 'packages/mcp-server' },
      { title: 'CLI', slug: 'packages/cli' },
      { title: 'Web UI', slug: 'packages/web-ui' },
      { title: 'TUI', slug: 'packages/tui' },
    ],
  },
  {
    title: 'Architecture',
    children: [
      { title: 'Database', slug: 'architecture/database' },
      { title: 'Monorepo', slug: 'architecture/monorepo' },
    ],
  },
  {
    title: 'FAQ',
    slug: 'faq',
  },
  {
    title: 'Troubleshooting',
    slug: 'troubleshooting',
  },
];

/** Flatten the tree into an array of { title, slug } for static generation */
export function getAllDocSlugs(): { title: string; slug: string }[] {
  const result: { title: string; slug: string }[] = [];
  for (const item of docsNav) {
    if (item.slug) {
      result.push({ title: item.title, slug: item.slug });
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.slug) {
          result.push({ title: child.title, slug: child.slug });
        }
      }
    }
  }
  return result;
}
