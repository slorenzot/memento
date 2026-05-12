import { ObservationEditor } from '@/components/observations/ObservationEditor';
import { useT } from '@/i18n/translation-context';

export default function LangNewObservationPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.observations.newObservation}
      </h1>
      <ObservationEditor mode="create" />
    </div>
  );
}
