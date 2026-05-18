'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { useT } from '@/i18n/translation-context';

interface ProjectDeleteProps {
  projectName: string;
  lang: string;
}

interface DeletionPreview {
  project: string;
  observations: number;
  sessions: number;
  prompts: number;
  journalEntries: number;
  hasRegistration: boolean;
}

export function ProjectDelete({ projectName, lang }: ProjectDeleteProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const t = useT();

  const canSubmit = confirmText === projectName;

  // Fetch preview when dialog opens
  useEffect(() => {
    if (!open) {
      setPreview(null);
      setConfirmText('');
      setError(null);
      return;
    }

    async function fetchPreview() {
      try {
        const res = await fetch(
          `/api/projects/${encodeURIComponent(projectName)}?preview=true`,
        );
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch {
        // Preview fetch failed silently — dialog still works
      }
    }

    fetchPreview();
  }, [open, projectName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectName)}`,
        { method: 'DELETE' },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t.projects.deleteProjectError);
      }

      setOpen(false);
      router.push(`/${lang}/projects`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.projects.deleteProjectError,
      );
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
        <Trash2 className="size-4" />
        {t.projects.deleteProject}
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
                {t.projects.deleteProjectTitle.replace('{name}', projectName)}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--color-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Warning */}
              <p className="text-[13px] text-[var(--color-secondary)]">
                {t.projects.deleteProjectWarning}
              </p>

              {/* Preview counts */}
              {preview && (
                <div className="space-y-1">
                  <p className="text-[13px] font-medium text-[var(--color-secondary)]">
                    {t.projects.deleteProjectData}
                  </p>
                  <ul className="ml-4 list-disc space-y-0.5 text-[13px] text-[var(--color-tertiary)]">
                    {preview.observations > 0 && (
                      <li>
                        {t.projects.deleteProjectPreviewObs.replace(
                          '{count}',
                          String(preview.observations),
                        )}
                      </li>
                    )}
                    {preview.sessions > 0 && (
                      <li>
                        {t.projects.deleteProjectPreviewSessions.replace(
                          '{count}',
                          String(preview.sessions),
                        )}
                      </li>
                    )}
                    {preview.prompts > 0 && (
                      <li>
                        {t.projects.deleteProjectPreviewPrompts.replace(
                          '{count}',
                          String(preview.prompts),
                        )}
                      </li>
                    )}
                    {preview.journalEntries > 0 && (
                      <li>
                        {t.projects.deleteProjectPreviewJournal.replace(
                          '{count}',
                          String(preview.journalEntries),
                        )}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Export warning */}
              <p className="text-[12px] italic text-[var(--color-tertiary)]">
                {t.projects.deleteProjectExport}
              </p>

              {/* Type to confirm */}
              <div>
                <label className="block text-[13px] text-[var(--color-secondary)] mb-1">
                  {t.projects.deleteProjectConfirm}
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={projectName}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              {error && (
                <p className="text-[13px] text-red-500">{error}</p>
              )}

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
                  {submitting
                    ? t.common.deleting
                    : t.projects.deleteProjectSubmit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
