'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPES = [
  'decision', 'bug', 'discovery', 'note', 'summary',
  'learning', 'pattern', 'architecture', 'config', 'preference',
];

interface ObservationEditorProps {
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

export function ObservationEditor({ mode, initialData, observationId }: ObservationEditorProps) {
  const router = useRouter();
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
        ? '/api/observations'
        : `/api/observations/${observationId}`;

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
        throw new Error(err.message || 'Save failed');
      }

      const obs = await res.json();
      router.push(`/observations/${obs.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What did you observe?"
          required
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
        />
      </div>

      {/* Content */}
      <div>
        <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe what/why/where/learned..."
          required
          rows={8}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none resize-y"
        />
      </div>

      {/* Type + Scope row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            Scope
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
            Topic Key
          </label>
          <input
            type="text"
            value={topicKey}
            onChange={(e) => setTopicKey(e.target.value)}
            placeholder="e.g. architecture/auth-model"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--color-secondary)]">
            Project
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="e.g. my-project"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-tertiary)] focus:border-[var(--color-border-strong)] focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full px-5 py-2 text-[14px] text-[var(--color-secondary)] hover:text-[var(--color-text-primary)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
