import Link from 'next/link';
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

export function CardGrid() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-[32px] font-bold text-[var(--color-text-primary)] tracking-tight">
          Memento
        </h1>
        <p className="text-[16px] text-[var(--color-text-secondary)] leading-relaxed max-w-[600px]">
          Persistent memory for AI coding agents. Capture decisions, discoveries, and patterns from
          your coding sessions and recover them across conversations.
        </p>
      </div>

      {/* Main cards */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          Getting Started
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            title="Quickstart"
            description="Get up and running with your first observation in 5 minutes"
            href="/docs/quickstart"
            icon={Rocket}
          />
          <Card
            title="CLI Reference"
            description="Full command-line interface documentation"
            href="/docs/cli/reference"
            icon={Terminal}
          />
          <Card
            title="MCP Tools"
            description="21 tools for AI agent integration via Model Context Protocol"
            href="/docs/mcp/introduction"
            icon={Plug}
          />
          <Card
            title="API Reference"
            description="REST API endpoints and examples"
            href="/docs/api/introduction"
            icon={Code}
          />
        </div>
      </section>

      {/* Packages */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          Packages
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Core"
            description="Database engine, observations, sessions, and search"
            href="/docs/packages/core"
            icon={Box}
          />
          <Card
            title="MCP Server"
            description="Model Context Protocol server with 21 tools"
            href="/docs/packages/mcp-server"
            icon={Plug}
          />
          <Card
            title="CLI"
            description="Command-line interface for terminal workflows"
            href="/docs/packages/cli"
            icon={Terminal}
          />
          <Card
            title="Web UI"
            description="Next.js dashboard for browsing and managing memory"
            href="/docs/packages/web-ui"
            icon={Monitor}
          />
          <Card
            title="TUI"
            description="Terminal UI built with Ink and React"
            href="/docs/packages/tui"
            icon={Tv}
          />
        </div>
      </section>

      {/* Resources */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          Resources
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Core Concepts"
            description="Observations, sessions, projects, journal, and search"
            href="/docs/core-concepts/observations"
            icon={BookOpen}
          />
          <Card
            title="Architecture"
            description="Database design, FTS5 search, and monorepo structure"
            href="/docs/architecture/database"
            icon={Layers}
          />
          <Card
            title="FAQ & Troubleshooting"
            description="Common questions and solutions to known issues"
            href="/docs/faq"
            icon={Wrench}
          />
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-[13px] font-medium text-[var(--color-tertiary)] uppercase tracking-wider mb-3">
          Capabilities
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Context Recovery"
            description="Recover what happened in previous sessions"
            href="/docs/capabilities/context-recovery"
            icon={Cpu}
          />
          <Card
            title="Passive Capture"
            description="Extract learnings from text with automatic deduplication"
            href="/docs/capabilities/passive-capture"
            icon={BookOpen}
          />
          <Card
            title="Export & Import"
            description="Backup and migrate memory in JSON, XML, or TXT"
            href="/docs/capabilities/export-import"
            icon={Layers}
          />
        </div>
      </section>
    </div>
  );
}
