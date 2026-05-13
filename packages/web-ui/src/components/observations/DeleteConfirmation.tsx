'use client';

import { useState } from 'react';
import { useT } from '@/i18n/translation-context';

interface DeleteConfirmationProps {
  observationId: number;
  observationTitle: string;
  onCancel: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmation({
  observationId,
  observationTitle,
  onCancel,
  onDeleted,
}: DeleteConfirmationProps) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/observations/${observationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.deleteConfirmation.deleteFailed);
      }

      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteConfirmation.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-surface)] p-4">
      <h4 className="text-[14px] font-medium text-[var(--color-error-text)]">
        {t.deleteConfirmation.title.replace('{title}', observationTitle)}
      </h4>
      <p className="mt-1 text-[13px] text-[var(--color-error)]">
        {t.deleteConfirmation.description}
      </p>

      {error && (
        <p className="mt-2 text-[13px] text-[var(--color-error)]">{error}</p>
      )}

      <div className="mt-3">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t.deleteConfirmation.reasonPlaceholder}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:outline-none"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full bg-[var(--color-error)] px-4 py-1.5 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {deleting ? t.common.deleting : t.common.delete}
        </button>
        <button
          onClick={onCancel}
          className="rounded-full px-4 py-1.5 text-[13px] text-[var(--color-error)] hover:text-[var(--color-error-text)]"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
