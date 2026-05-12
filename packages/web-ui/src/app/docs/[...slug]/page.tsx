import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { getAllDocSlugs } from '@/components/docs/docs-nav';
import { getLocaleFromCookie, getDictionary } from '@/i18n/get-dictionary';
import { resolveContentPath } from '@/lib/docs-content';

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

  const { readFile } = await import('fs/promises');
  const content = await readFile(filePath, 'utf-8');

  return (
    <article className="docs-page">
      <MarkdownContent content={content} />
    </article>
  );
}
