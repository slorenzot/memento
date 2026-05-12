'use client';

import { ObservationEditor } from '@/components/observations/ObservationEditor';
import { useT } from '@/i18n/translation-context';
import type { Observation } from '@slorenzot/memento-core';

interface EditObservationContentProps {
  observation: Observation;
}

export function EditObservationContent({ observation }: EditObservationContentProps) {
  const t = useT();

  if (observation.readOnly) {
    return (
      <div className="py-8 text-center">
        <p className="text-[14px] text-[var(--color-tertiary)]">
          {t.observationEditor.readOnly}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.observationEditor.editTitle}
      </h1>
      <ObservationEditor
        mode="edit"
        observationId={observation.id}
        initialData={{
          title: observation.title,
          content: observation.content,
          type: observation.type,
          topicKey: observation.topicKey,
          scope: observation.scope,
          projectId: observation.projectId,
        }}
      />
    </div>
  );
}
