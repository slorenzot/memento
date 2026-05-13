import { ObservationEditor } from '@/components/observations/ObservationEditor';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export default async function LangNewObservationPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = getDictionary(lang as Locale);

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.observations.newObservation}
      </h1>
      <ObservationEditor mode="create" />
    </div>
  );
}
