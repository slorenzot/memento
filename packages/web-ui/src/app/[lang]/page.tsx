import { redirect } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';

interface LangRootProps {
  params: Promise<{ lang: string }>;
}

export default async function LangRootPage({ params }: LangRootProps) {
  const { lang } = await params;

  if (!isValidLocale(lang)) {
    redirect('/dashboard');
  }

  redirect(`/${lang}/dashboard`);
}
