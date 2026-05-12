'use client';

import { useState } from 'react';
import { Badge } from '@/components/shared/Badge';
import { useT } from '@/i18n/translation-context';

const TYPES = [
  'decision', 'bug', 'discovery', 'note', 'summary',
  'learning', 'pattern', 'architecture', 'config', 'preference',
];

const SCOPES = ['project', 'personal'] as const;

interface ObservationFiltersProps {
  projects: string[];
}

export function ObservationFilters({ projects }: ObservationFiltersProps) {
  const t = useT();
  const [activeType, setActiveType] = useState('');

  // We still use URL params for actual filtering, but labels are translated
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const activeScope = searchParams.get('scope') ?? '';
  const activeProject = searchParams.get('projectId') ?? '';
  const urlActiveType = searchParams.get('type') ?? '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when changing filters
    params.delete('page');
    window.location.href = `/observations?${params.toString()}`;
  }

  return (
    <div className="space-y-3">
      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((type) => (
          <Badge
            key={type}
            type={type}
            active={urlActiveType === type}
            onClick={() => updateFilter('type', urlActiveType === type ? '' : type)}
          />
        ))}
      </div>

      {/* Scope + Project filters */}
      <div className="flex items-center gap-3">
        <select
          value={activeScope}
          onChange={(e) => updateFilter('scope', e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
        >
          <option value="">{t.common.allScopes}</option>
          {SCOPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {projects.length > 0 && (
          <select
            value={activeProject}
            onChange={(e) => updateFilter('projectId', e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[13px] text-[var(--color-text-primary)]"
          >
            <option value="">{t.common.allProjects}</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
