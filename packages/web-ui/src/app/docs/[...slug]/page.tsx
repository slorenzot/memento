import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { getAllDocSlugs } from '@/components/docs/docs-nav';
import { getLocaleFromCookie, getDictionary } from '@/i18n/get-dictionary';

const CONTENT_DIR = join(process.cwd(), 'content/docs');

/** Resolve a slug array to a markdown file path */
async function resolveContentPath(slug: string[]): Promise<string | null> {
  const relative = join(...slug);

  // Try exact path with .md extension
  const candidates = [
    join(CONTENT_DIR, `${relative}.md`),
    join(CONTENT_DIR, relative, 'index.md'),
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf-8');
      return candidate;
    } catch {
      // File doesn't exist, try next candidate
    }
  }

  return null;
}

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map(({ slug }) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const allSlugs = getAllDocSlugs();
  const match = allSlugs.find((s) => s.slug === slug.join('/'));
  const t = getDictionary(await getLocaleFromCookie());

  return {
    title: match ? `${match.title} — ${t.docs.docsTitle}` : t.docs.docsTitle,
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const filePath = await resolveContentPath(slug);

  if (!filePath) {
    notFound();
  }

  const content = await readFile(filePath, 'utf-8');

  return (
    <article className="docs-page">
      <MarkdownContent content={content} />
    </article>
  );
}
