import { DocsSidebar } from '@/components/docs/DocsSidebar';
import type { Locale } from '@/i18n/config';
import { isValidLocale } from '@/i18n/config';

interface LangDocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LangDocsLayout({ children, params }: LangDocsLayoutProps) {
  const { lang } = await params;

  if (!isValidLocale(lang)) {
    return null;
  }

  return (
    <div className="flex gap-8">
      <aside className="hidden lg:block w-[200px] shrink-0">
        <DocsSidebar lang={lang} />
      </aside>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
