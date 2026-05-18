import Link from 'next/link';
import { RelativeTime } from '@/components/shared/RelativeTime';
import { Badge } from '../shared/Badge';
import { FolderKanbanIcon, HistoryIcon } from 'lucide-react';

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
      <FolderKanbanIcon />
      <h3 className="text-[16px] font-medium text-[var(--color-text-primary)] truncate">
        {project.name}
      </h3>
      <div className="mt-1 gap-2 text-[13px] text-[var(--color-tertiary)]">
        <div>
          <span>{labels.observations.replace('{count}', String(totalObs))} mementos</span>
        </div>
        <div>
          {project.lastActivity && (
            <div className="flex justify-start">
              <HistoryIcon className="size-4 mr-1" />
              <div>
                {labels.lastActivity}: <RelativeTime date={project.lastActivity} />
              </div>
            </div>
          )}
        </div>
      </div>
      {sortedTypes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {sortedTypes.map(([type, count]) => {
            const pct = (count / maxCount) * 100;
            return (
              <div key={type} className="flex items-center gap-2 text-[12px]">
                <Badge type={type} />
                <span className="text-[var(--color-tertiary)]">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}
