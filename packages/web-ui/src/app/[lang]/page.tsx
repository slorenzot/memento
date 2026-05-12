import { redirect } from 'next/navigation';
import { isValidLocale, DEFAULT_LOCALE } from '@/i18n/config';

interface LangRootProps {
  params: Promise<{ lang: string }>;
}

export default async function LangRootPage({ params }: LangRootProps) {
  const { lang } = await params;

  if (!isValidLocale(lang)) {
    redirect(`/${DEFAULT_LOCALE}/dashboard`);
  }

  redirect(`/${lang}/dashboard`);
}
