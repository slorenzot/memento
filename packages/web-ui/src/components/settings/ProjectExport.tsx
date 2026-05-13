'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/i18n/translation-context';

interface Project {
  name: string;
  activeCount: number;
}

export default function ProjectExport() {
  const t = useT();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0].name);
        }
      })
      .catch(() => setError('Failed to load projects'));
  }, []);

  const handleExport = async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }

      // Download the file
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memento-${selectedProject}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
        {t.dataManagement.exportTitle}
      </h3>
      <p className="text-[13px] text-[var(--color-secondary)]">
        {t.dataManagement.exportDescription}
      </p>

      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-[12px] font-medium text-[var(--color-tertiary)] mb-1">
            {t.dataManagement.selectProject}
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.activeCount})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || !selectedProject || projects.length === 0}
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? t.dataManagement.exporting : t.dataManagement.exportButton}
        </button>
      </div>
    </div>
  );
}
