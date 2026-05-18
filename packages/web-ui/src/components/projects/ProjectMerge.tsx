'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, X } from 'lucide-react';
import { useT } from '@/i18n/translation-context';

interface ProjectMergeProps {
  sourceProject: string;
  allProjects: Array<{
    name: string;
    activeCount: number;
    deletedCount: number;
    lastActivity: Date | null;
    byType: Record<string, number>;
  }>;
  lang: string;
}

export function ProjectMerge({
  sourceProject,
  allProjects,
  lang,
}: ProjectMergeProps) {
  const [open, setOpen] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const t = useT();

  const otherProjects = allProjects.filter((p) => p.name !== sourceProject);
  const canSubmit = confirmText === targetName && targetName !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceProject, target: targetName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.projects.mergeError);
      }

      setOpen(false);
      router.push(`/${lang}/projects/${encodeURIComponent(targetName)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.projects.mergeError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <GitMerge className="size-4" />
        {t.projects.merge}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
                {t.projects.mergeTitle}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source (read-only) */}
              <div>
                <label className="block text-[13px] text-[var(--color-secondary)] mb-1">
                  {t.projects.mergeSource}
                </label>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]">
                  {sourceProject}
                </div>
              </div>

              {/* Target selector */}
              <div>
                <label className="block text-[13px] text-[var(--color-secondary)] mb-1">
                  {t.projects.mergeTarget}
                </label>
                <select
                  value={targetName}
                  onChange={(e) => {
                    setTargetName(e.target.value);
                    setConfirmText('');
                  }}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                >
                  <option value="">—</option>
                  {otherProjects.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview */}
              {targetName && (
                <div className="rounded-lg border border-[var(--color-border)] p-3 space-y-1 text-[13px]">
                  <p className="font-medium text-[var(--color-secondary)]">
                    {t.projects.mergePreview}:
                  </p>
                  <p className="text-[var(--color-tertiary)]">
                    {t.projects.mergePreviewObs.replace(
                      '{count}',
                      String(
                        allProjects.find((p) => p.name === targetName)
                          ?.activeCount ?? 0,
                      ),
                    )}
                  </p>
                </div>
              )}

              {/* Warning */}
              <p className="text-[12px] text-[var(--color-tertiary)] italic">
                {t.projects.mergeWarning}
              </p>

              {/* Type to confirm */}
              {targetName && (
                <div>
                  <label className="block text-[13px] text-[var(--color-secondary)] mb-1">
                    {t.projects.mergeConfirm}
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={targetName}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>
              )}

              {error && <p className="text-[13px] text-red-500">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t.common.saving : t.projects.mergeSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
