import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Locale } from '@/i18n/config';
import { DEFAULT_LOCALE } from '@/i18n/config';

const CONTENT_DIR = join(process.cwd(), 'content/docs');

/**
 * Resolve a slug to a markdown file path, with locale-aware lookup.
 *
 * 1. Try content/docs/{lang}/{slug}.md (locale-specific)
 * 2. Fallback to content/docs/{slug}.md (English default)
 */
export async function resolveContentPath(
  slug: string[],
  lang?: Locale,
): Promise<string | null> {
  const relative = join(...slug);

  // Try locale-specific file first (if lang provided and not default)
  if (lang && lang !== DEFAULT_LOCALE) {
    const localeCandidates = [
      join(CONTENT_DIR, lang, `${relative}.md`),
      join(CONTENT_DIR, lang, relative, 'index.md'),
    ];

    for (const candidate of localeCandidates) {
      try {
        await readFile(candidate, 'utf-8');
        return candidate;
      } catch {
        // File doesn't exist, try next
      }
    }
  }

  // Fallback to default (English)
  const defaultCandidates = [
    join(CONTENT_DIR, `${relative}.md`),
    join(CONTENT_DIR, relative, 'index.md'),
  ];

  for (const candidate of defaultCandidates) {
    try {
      await readFile(candidate, 'utf-8');
      return candidate;
    } catch {
      // File doesn't exist, try next
    }
  }

  return null;
}
