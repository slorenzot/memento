import { getEngine } from '@/lib/engine';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';
import { StatCard } from '@/components/dashboard/StatsCards';
import { TypeDistribution } from '@/components/dashboard/TypeDistribution';
import { MementoCard } from '@/components/mementos/MementoCard';
import { SessionCard } from '@/components/sessions/SessionCard';
import { ProjectMerge } from '@/components/projects/ProjectMerge';
import { ProjectDelete } from '@/components/projects/ProjectDelete';
import Link from 'next/link';
import { ArrowLeft, FolderIcon, TagIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ name: string; lang: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { name, lang } = await params;
  const engine = getEngine();
  const t = getDictionary(lang as Locale);
  const prefix = `/${lang}`;
  const decodedName = decodeURIComponent(name);

  const projects = await engine.listProjects();
  const project = projects.find((p) => p.name === decodedName);
  if (!project) notFound();

  const registered = engine
    .listRegisteredProjects()
    .find((p) => p.name === decodedName);
  const recentObs = await engine.search({ projectId: decodedName, limit: 10 });
  const sessionsResult = await engine.listSessions({
    projectId: decodedName,
    limit: 10,
  });

  const totalObs = project.activeCount + project.deletedCount;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`${prefix}/projects`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t.projects.backToProjects}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-tertiary)]">
            {registered?.workingDir && (
              <div className="flex items-center gap-1.5">
                <FolderIcon className="size-4" />
                <span>{registered.workingDir}</span>
              </div>
            )}
            {registered?.aliases && registered.aliases.length > 0 && (
              <div className="flex items-center gap-1.5">
                <TagIcon className="size-4" />
                <span>
                  {t.projects.aliases}: {registered.aliases.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProjectMerge
            sourceProject={decodedName}
            allProjects={projects}
            lang={lang}
          />
          <ProjectDelete
            projectName={decodedName}
            lang={lang}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.projects.totalObservations} value={totalObs} />
        <StatCard
          label={t.projects.activeObservations}
          value={project.activeCount}
        />
        <StatCard
          label={t.projects.deletedObservations}
          value={project.deletedCount}
        />
        <StatCard label={t.projects.sessions} value={sessionsResult.total} />
      </div>

      {/* Type Distribution */}
      <TypeDistribution byType={project.byType} />

      {/* Recent Observations */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-[var(--color-secondary)]">
            {t.projects.recentObservations}
          </h2>
          <Link
            href={`${prefix}/mementos?projectId=${encodeURIComponent(decodedName)}`}
            className="text-[13px] text-[var(--color-tertiary)] hover:text-[var(--color-secondary)] transition-colors"
          >
            {t.projects.observations.replace(
              '{count}',
              String(recentObs.total),
            )}{' '}
            →
          </Link>
        </div>
        {recentObs.observations.length === 0 ? (
          <p className="text-[13px] text-[var(--color-tertiary)]">
            {t.projects.none}
          </p>
        ) : (
          <div className="grid gap-3">
            {recentObs.observations.map((obs) => (
              <MementoCard key={obs.id} observation={obs} />
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-[var(--color-secondary)]">
            {t.projects.allSessions}
          </h2>
          <Link
            href={`${prefix}/sessions?projectId=${encodeURIComponent(decodedName)}`}
            className="text-[13px] text-[var(--color-tertiary)] hover:text-[var(--color-secondary)] transition-colors"
          >
            {t.projects.sessionCount.replace(
              '{count}',
              String(sessionsResult.total),
            )}{' '}
            →
          </Link>
        </div>
        {sessionsResult.sessions.length === 0 ? (
          <p className="text-[13px] text-[var(--color-tertiary)]">
            {t.projects.none}
          </p>
        ) : (
          <div className="grid gap-3">
            {sessionsResult.sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
