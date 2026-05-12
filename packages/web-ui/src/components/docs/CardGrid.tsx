'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Rocket,
  Terminal,
  Plug,
  Code,
  Box,
  Cpu,
  Monitor,
  Tv,
  BookOpen,
  Wrench,
  Layers,
} from 'lucide-react';
import { useT } from '@/i18n/translation-context';

interface CardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

function Card({ title, description, href, icon: Icon }: CardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
        <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
        {description}
      </p>
    </Link>
  );
}

/**
 * Detect the docs locale prefix from the current pathname.
 * Returns '/es/docs' if under Spanish docs, otherwise '/docs'.
 */
function useDocsPrefix(): string {
  const pathname = usePathname();
  const match = pathname.match(/^\/(es)\//);
  return match ? `/${match[1]}/docs` : '/docs';
}

export function CardGrid() {
  const t = useT();
  const prefix = useDocsPrefix();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-[32px] font-bold text-[var(--color-text-primary)] tracking-tight">
          {t.docs.hero.title}
        </h1>
        <p className="text-[16px] text-[var(--color-text-secondary)] leading-relaxed max-w-[600px]">
          {t.docs.hero.description}
        </p>
      </div>

      {/* Main cards */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          {t.docs.sections.gettingStarted}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title={t.docs.cards.quickstart.title} description={t.docs.cards.quickstart.description} href={`${prefix}/quickstart`} icon={Rocket} />
          <Card title={t.docs.cards.cliReference.title} description={t.docs.cards.cliReference.description} href={`${prefix}/cli/reference`} icon={Terminal} />
          <Card title={t.docs.cards.mcpTools.title} description={t.docs.cards.mcpTools.description} href={`${prefix}/mcp/introduction`} icon={Plug} />
          <Card title={t.docs.cards.apiReference.title} description={t.docs.cards.apiReference.description} href={`${prefix}/api/introduction`} icon={Code} />
        </div>
      </section>

      {/* Packages */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          {t.docs.sections.packages}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={t.docs.cards.core.title} description={t.docs.cards.core.description} href={`${prefix}/packages/core`} icon={Box} />
          <Card title={t.docs.cards.mcpServer.title} description={t.docs.cards.mcpServer.description} href={`${prefix}/packages/mcp-server`} icon={Plug} />
          <Card title={t.docs.cards.cli.title} description={t.docs.cards.cli.description} href={`${prefix}/packages/cli`} icon={Terminal} />
          <Card title={t.docs.cards.webUi.title} description={t.docs.cards.webUi.description} href={`${prefix}/packages/web-ui`} icon={Monitor} />
          <Card title={t.docs.cards.tui.title} description={t.docs.cards.tui.description} href={`${prefix}/packages/tui`} icon={Tv} />
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          {t.docs.sections.resources}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={t.docs.cards.coreConcepts.title} description={t.docs.cards.coreConcepts.description} href={`${prefix}/core-concepts/observations`} icon={BookOpen} />
          <Card title={t.docs.cards.architecture.title} description={t.docs.cards.architecture.description} href={`${prefix}/architecture/database`} icon={Layers} />
          <Card title={t.docs.cards.faqTroubleshooting.title} description={t.docs.cards.faqTroubleshooting.description} href={`${prefix}/faq`} icon={Wrench} />
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          {t.docs.sections.capabilities}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={t.docs.cards.contextRecovery.title} description={t.docs.cards.contextRecovery.description} href={`${prefix}/capabilities/context-recovery`} icon={Cpu} />
          <Card title={t.docs.cards.passiveCapture.title} description={t.docs.cards.passiveCapture.description} href={`${prefix}/capabilities/passive-capture`} icon={BookOpen} />
          <Card title={t.docs.cards.exportImport.title} description={t.docs.cards.exportImport.description} href={`${prefix}/capabilities/export-import`} icon={Layers} />
        </div>
      </section>
    </div>
  );
}
