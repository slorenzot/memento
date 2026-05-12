import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import { MarkdownContent } from '@/components/shared/MarkdownContent';
import { getAllDocSlugs } from '@/components/docs/docs-nav';
import { getDictionary } from '@/i18n/get-dictionary';
import { resolveContentPath } from '@/lib/docs-content';
import { isValidLocale, LOCALES, type Locale } from '@/i18n/config';

interface PageProps {
  params: Promise<{ lang: string; slug: string[] }>;
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  const params = [];

  for (const locale of LOCALES) {
    if (locale === 'en') continue; // English served from /docs/*
    for (const { slug } of slugs) {
      params.push({
        lang: locale,
        slug: slug.split('/'),
      });
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const { lang, slug } = await params;

  if (!isValidLocale(lang)) return { title: 'Memento Docs' };

  const allSlugs = getAllDocSlugs();
  const match = allSlugs.find((s) => s.slug === slug.join('/'));
  const t = getDictionary(lang as Locale);

  return {
    title: match ? `${match.title} — ${t.docs.docsTitle}` : t.docs.docsTitle,
    alternates: {
      languages: {
        en: `/docs/${slug.join('/')}`,
        es: `/es/docs/${slug.join('/')}`,
      },
    },
  };
}

export default async function LangDocPage({ params }: PageProps) {
  const { lang, slug } = await params;

  if (!isValidLocale(lang)) {
    notFound();
  }

  const filePath = await resolveContentPath(slug, lang as Locale);

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
