/**
 * docs-nav.ts — Documentation navigation tree.
 *
 * Defines the sidebar structure for the /docs section.
 * Each entry maps to a markdown file in content/docs/.
 *
 * `navKey` maps to a translation key in `t.docs.nav[key]`.
 * The `title` is used as fallback / for static generation.
 */

export interface DocNavItem {
  title: string;
  navKey?: string; // i18n key in t.docs.nav
  slug?: string; // relative to /docs — maps to content/docs/{slug}.md
  icon?: string;
  children?: DocNavItem[];
}

export const docsNav: DocNavItem[] = [
  {
    title: 'Quickstart',
    navKey: 'quickstart',
    slug: 'quickstart',
  },
  {
    title: 'Core Concepts',
    navKey: 'coreConcepts',
    children: [
      { title: 'Observations', navKey: 'observations', slug: 'core-concepts/observations' },
      { title: 'Sessions', navKey: 'sessions', slug: 'core-concepts/sessions' },
      { title: 'Projects', navKey: 'projects', slug: 'core-concepts/projects' },
      { title: 'Journal', navKey: 'journal', slug: 'core-concepts/journal' },
      { title: 'Search', navKey: 'search', slug: 'core-concepts/search' },
    ],
  },
  {
    title: 'Capabilities',
    navKey: 'capabilities',
    children: [
      { title: 'Context Recovery', navKey: 'contextRecovery', slug: 'capabilities/context-recovery' },
      { title: 'Passive Capture', navKey: 'passiveCapture', slug: 'capabilities/passive-capture' },
      { title: 'Export & Import', navKey: 'exportImport', slug: 'capabilities/export-import' },
      { title: 'Merge', navKey: 'merge', slug: 'capabilities/merge' },
      { title: 'Pin & Lock', navKey: 'pinLock', slug: 'capabilities/pin-lock' },
    ],
  },
  {
    title: 'MCP Tools',
    navKey: 'mcpTools',
    children: [
      { title: 'Introduction', navKey: 'mcpIntroduction', slug: 'mcp/introduction' },
      { title: 'Tools Reference', navKey: 'toolsReference', slug: 'mcp/tools-reference' },
    ],
  },
  {
    title: 'CLI',
    navKey: 'cli',
    children: [
      { title: 'Reference', navKey: 'cliReference', slug: 'cli/reference' },
    ],
  },
  {
    title: 'API',
    navKey: 'api',
    children: [
      { title: 'Introduction', navKey: 'apiIntroduction', slug: 'api/introduction' },
      { title: 'Observations', navKey: 'apiObservations', slug: 'api/observations' },
      { title: 'Sessions', navKey: 'apiSessions', slug: 'api/sessions' },
      { title: 'Search', navKey: 'apiSearch', slug: 'api/search' },
    ],
  },
  {
    title: 'Packages',
    navKey: 'packages',
    children: [
      { title: 'Core', navKey: 'core', slug: 'packages/core' },
      { title: 'MCP Server', navKey: 'mcpServer', slug: 'packages/mcp-server' },
      { title: 'CLI', navKey: 'cliPackage', slug: 'packages/cli' },
      { title: 'Web UI', navKey: 'webUi', slug: 'packages/web-ui' },
      { title: 'TUI', navKey: 'tui', slug: 'packages/tui' },
    ],
  },
  {
    title: 'Architecture',
    navKey: 'architecture',
    children: [
      { title: 'Database', navKey: 'database', slug: 'architecture/database' },
      { title: 'Monorepo', navKey: 'monorepo', slug: 'architecture/monorepo' },
    ],
  },
  {
    title: 'FAQ',
    navKey: 'faq',
    slug: 'faq',
  },
  {
    title: 'Troubleshooting',
    navKey: 'troubleshooting',
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
