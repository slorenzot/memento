import { ObservationEditor } from '@/components/observations/ObservationEditor';

export default function NewObservationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        New observation
      </h1>
      <ObservationEditor mode="create" />
    </div>
  );
}
