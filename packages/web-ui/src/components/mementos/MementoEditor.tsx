'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { OBSERVATION_TYPES, ObservationTypeIcon } from '@/components/shared/MementoTypeIcon';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';

interface MementoEditorProps {
  mode: 'create' | 'edit';
  initialData?: {
    title: string;
    content: string;
    type: string;
    topicKey: string | null;
    scope: string;
    projectId: string | null;
  };
  observationId?: number;
}

export function MementoEditor({ mode, initialData, observationId }: MementoEditorProps) {
  const router = useRouter();
  const t = useT();
  const prefix = useLocalePrefix();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [type, setType] = useState(initialData?.type ?? 'note');
  const [topicKey, setTopicKey] = useState(initialData?.topicKey ?? '');
  const [scope, setScope] = useState(initialData?.scope ?? 'project');
  const [projectId, setProjectId] = useState(initialData?.projectId ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const url = mode === 'create'
        ? '/api/mementos'
        : `/api/mementos/${observationId}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: Record<string, unknown> = {
        title: title.trim(),
        content: content.trim(),
        type,
        scope,
        topicKey: topicKey.trim() || null,
        projectId: projectId.trim() || 'default',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || t.observationEditor.saveFailed);
      }

      const obs = await res.json();
      router.push(`${prefix}/mementos/${obs.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.observationEditor.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
          {t.observationEditor.title}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.observationEditor.titlePlaceholder}
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
      </div>

      {/* Content */}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
          {t.observationEditor.content}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.observationEditor.contentPlaceholder}
          required
          rows={8}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none resize-y"
        />
      </div>

      {/* Type + Scope row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            {t.observationEditor.type}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {OBSERVATION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors',
                  type === t
                    ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:opacity-80',
                )}
              >
                <ObservationTypeIcon type={t} size={12} strokeWidth={2.5} />
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            {t.observationEditor.scope}
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
          >
            <option value="project">project</option>
            <option value="personal">personal</option>
          </select>
        </div>
      </div>

      {/* Topic Key + Project row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            {t.observationEditor.topicKey}
          </label>
          <input
            type="text"
            value={topicKey}
            onChange={(e) => setTopicKey(e.target.value)}
            placeholder={t.observationEditor.topicKeyPlaceholder}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            {t.observationEditor.project}
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder={t.observationEditor.projectPlaceholder}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-[14px] font-medium text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {saving ? t.common.saving : mode === 'create' ? t.common.create : t.common.saveChanges}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full px-5 py-2 text-[14px] text-[var(--color-secondary)] hover:text-[var(--color-text-primary)]"
        >
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}
