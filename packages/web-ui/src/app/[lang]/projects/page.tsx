import { getEngine } from '@/lib/engine';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { RegisterProject } from '@/components/projects/RegisterProject';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ lang: string }>;
}

export default async function ProjectsPage({ params }: Props) {
  const { lang } = await params;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);

  const projects = await engine.listProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {t.projects.title}
          <span className="ml-2 text-[14px] font-normal text-[var(--color-tertiary)]">
            ({projects.length})
          </span>
        </h1>
        <RegisterProject lang={lang} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title={t.projects.noProjects}
          description={t.projects.noProjectsDescription}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              lang={lang}
              labels={{
                observations: t.projects.observations,
                lastActivity: t.projects.lastActivity,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
