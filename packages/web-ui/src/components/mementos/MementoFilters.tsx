'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/shared/Badge';
import { useT } from '@/i18n/translation-context';
import { useLocalePrefix } from '@/i18n/use-locale-prefix';

const TYPES = [
  'decision', 'bug', 'discovery', 'note', 'summary',
  'learning', 'pattern', 'architecture', 'config', 'preference',
];

const SCOPES = ['project', 'personal'] as const;

interface MementoFiltersProps {
  projects: string[];
}

export function MementoFilters({ projects }: MementoFiltersProps) {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefix = useLocalePrefix();

  const activeScope = searchParams.get('scope') ?? '';
  const activeProject = searchParams.get('projectId') ?? '';
  const activeType = searchParams.get('type') ?? '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to page 1 when changing filters
    params.delete('page');
    router.push(`${prefix}/mementos?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((type) => (
          <Badge
            key={type}
            type={type}
            active={activeType === type}
            onClick={() => updateFilter('type', activeType === type ? '' : type)}
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
