import Link from 'next/link';
import { RelativeTime } from '@/components/shared/RelativeTime';

interface ProjectCardProps {
  project: {
    name: string;
    activeCount: number;
    deletedCount: number;
    lastActivity: Date | null;
    byType: Record<string, number>;
  };
  lang: string;
  labels: {
    observations: string;
    lastActivity: string;
  };
}

export function ProjectCard({ project, lang, labels }: ProjectCardProps) {
  const totalObs = project.activeCount + project.deletedCount;
  const sortedTypes = Object.entries(project.byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  const maxCount = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;

  return (
    <Link
      href={`/${lang}/projects/${encodeURIComponent(project.name)}`}
      className="block rounded-[var(--radius-2xl)] border border-[var(--color-border)] p-5 hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      <h3 className="text-[16px] font-medium text-[var(--color-text-primary)] truncate">
        {project.name}
      </h3>
      <div className="mt-1 flex items-center gap-2 text-[13px] text-[var(--color-tertiary)]">
        <span>
          {labels.observations.replace('{count}', String(totalObs))}
        </span>
        {project.lastActivity && (
          <>
            <span>·</span>
            <span>
              {labels.lastActivity}:{' '}
              <RelativeTime date={project.lastActivity} />
            </span>
          </>
        )}
      </div>
      {sortedTypes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {sortedTypes.map(([type, count]) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={type} className="flex items-center gap-2 text-[12px]">
                <span className="w-16 truncate capitalize text-[var(--color-secondary)]">
                  {type}
                </span>
                <div className="flex-1 h-1 rounded-full bg-[var(--color-surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[var(--color-tertiary)]">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}
