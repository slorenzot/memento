import { TranslationProvider } from '@/i18n/translation-context';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { isValidLocale } from '@/i18n/config';

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

/**
 * Top-level locale layout for /{lang}/* routes.
 *
 * Overrides the parent ClientLayout's TranslationProvider with
 * the URL-based locale, so all child pages and components use
 * the correct dictionary regardless of cookie/zustand settings.
 */
export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;

  if (!isValidLocale(lang)) {
    return null;
  }

  const dictionary = getDictionary(lang as Locale);

  return (
    <TranslationProvider dictionary={dictionary}>
      {children}
    </TranslationProvider>
  );
}
