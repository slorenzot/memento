import Link from 'next/link';
import { getLocaleFromCookie, getDictionary } from '@/i18n/get-dictionary';
import { DEFAULT_LOCALE } from '@/i18n/config';

export default async function NotFound() {
  const locale = (await getLocaleFromCookie()) ?? DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {t.notFound.title}
        </h2>
        <p className="mt-2 text-[14px] text-[var(--color-secondary)]">
          {t.notFound.description}
        </p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-6 inline-block rounded-full bg-[var(--color-primary)] px-4 py-2 text-[14px] text-white hover:bg-[var(--color-accent-hover)]"
        >
          {t.notFound.goHome}
        </Link>
      </div>
    </div>
  );
}
