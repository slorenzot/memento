'use client';

import { useState, useRef, useCallback } from 'react';
import { useT } from '@/i18n/translation-context';

interface PreviewStats {
  version: string;
  stats: {
    totalProjects: number;
    totalSessions: number;
    totalObservations: number;
    totalPrompts: number;
    totalJournalEntries: number;
  };
  source: { project: string };
}

interface ImportResult {
  imported: {
    projects: number;
    sessions: number;
    observations: number;
    prompts: number;
    journalEntries: number;
  };
  skipped: {
    observations: number;
    sessions: number;
    journalEntries: number;
  };
  overwritten: {
    observations: number;
  };
  failed: number;
  errors: string[];
}

type ImportStep = 'select' | 'preview' | 'importing' | 'result';

export default function ProjectImport() {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('select');
  const [fileData, setFileData] = useState<unknown>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite' | 'fail'>('skip');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseFile = useCallback(async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version) {
        setError(t.dataManagement.invalidFile);
        return;
      }

      setFileData(data);

      // Get preview
      const res = await fetch('/api/projects/import', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || t.dataManagement.previewFailed);
        return;
      }

      const previewData = await res.json();
      setPreview(previewData);
      setStep('preview');
    } catch {
      setError(t.dataManagement.invalidFile);
    }
  }, [t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleImport = async () => {
    if (!fileData) return;

    setStep('importing');
    setError(null);

    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: fileData,
          conflictStrategy,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const importResult = await res.json();
      setResult(importResult);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  };

  const handleReset = () => {
    setStep('select');
    setFileData(null);
    setFileName('');
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
        {t.dataManagement.importTitle}
      </h3>
      <p className="text-[13px] text-[var(--color-secondary)]">
        {t.dataManagement.importDescription}
      </p>

      {error && (
        <p className="text-[13px] text-red-500">{error}</p>
      )}

      {/* Step 1: File selection */}
      {step === 'select' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver
              ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)]'
              : 'border-[var(--color-border)]'
          }`}
        >
          <p className="text-[14px] text-[var(--color-secondary)] mb-3">
            {t.dataManagement.dropFile}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {t.dataManagement.browseFiles}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-secondary)]">{t.dataManagement.file}</span>
              <span className="text-[13px] text-[var(--color-text-primary)]">{fileName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-secondary)]">{t.dataManagement.version}</span>
              <span className="text-[13px] text-[var(--color-text-primary)]">{preview.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-secondary)]">{t.dataManagement.source}</span>
              <span className="text-[13px] text-[var(--color-text-primary)]">{preview.source.project}</span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <h4 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-2">
              {t.dataManagement.dataToImport}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {preview.stats.totalProjects > 0 && (
                <div className="text-[13px] text-[var(--color-secondary)]">
                  {t.dataManagement.projects}: <span className="text-[var(--color-text-primary)]">{preview.stats.totalProjects}</span>
                </div>
              )}
              {preview.stats.totalSessions > 0 && (
                <div className="text-[13px] text-[var(--color-secondary)]">
                  {t.dataManagement.sessions}: <span className="text-[var(--color-text-primary)]">{preview.stats.totalSessions}</span>
                </div>
              )}
              {preview.stats.totalObservations > 0 && (
                <div className="text-[13px] text-[var(--color-secondary)]">
                  {t.dataManagement.observations}: <span className="text-[var(--color-text-primary)]">{preview.stats.totalObservations}</span>
                </div>
              )}
              {preview.stats.totalPrompts > 0 && (
                <div className="text-[13px] text-[var(--color-secondary)]">
                  {t.dataManagement.prompts}: <span className="text-[var(--color-text-primary)]">{preview.stats.totalPrompts}</span>
                </div>
              )}
              {preview.stats.totalJournalEntries > 0 && (
                <div className="text-[13px] text-[var(--color-secondary)]">
                  {t.dataManagement.journal}: <span className="text-[var(--color-text-primary)]">{preview.stats.totalJournalEntries}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-[var(--color-tertiary)]">
              {t.dataManagement.conflictStrategy}
            </label>
            <select
              value={conflictStrategy}
              onChange={(e) => setConflictStrategy(e.target.value as typeof conflictStrategy)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[14px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="skip">{t.dataManagement.skipDuplicates}</option>
              <option value="overwrite">{t.dataManagement.overwriteDuplicates}</option>
              <option value="fail">{t.dataManagement.failOnDuplicate}</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
            >
              {t.dataManagement.importButton}
            </button>
            <button
              onClick={handleReset}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="rounded-lg border border-[var(--color-border)] p-6 text-center">
          <div className="animate-pulse text-[14px] text-[var(--color-secondary)]">
            {t.dataManagement.importing}
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-2">
            <h4 className="text-[13px] font-medium text-[var(--color-text-primary)] mb-3">
              {t.dataManagement.importResult}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {result.imported.observations > 0 && (
                <div className="text-[13px]">
                  <span className="text-green-500">✓</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.observations}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.imported.observations}</span>
                </div>
              )}
              {result.imported.sessions > 0 && (
                <div className="text-[13px]">
                  <span className="text-green-500">✓</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.sessions}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.imported.sessions}</span>
                </div>
              )}
              {result.imported.journalEntries > 0 && (
                <div className="text-[13px]">
                  <span className="text-green-500">✓</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.journal}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.imported.journalEntries}</span>
                </div>
              )}
              {result.imported.prompts > 0 && (
                <div className="text-[13px]">
                  <span className="text-green-500">✓</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.prompts}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.imported.prompts}</span>
                </div>
              )}
              {result.skipped.observations > 0 && (
                <div className="text-[13px]">
                  <span className="text-yellow-500">⚠</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.skipped}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.skipped.observations}</span>
                </div>
              )}
              {result.overwritten.observations > 0 && (
                <div className="text-[13px]">
                  <span className="text-blue-500">↻</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.overwritten}:</span>{' '}
                  <span className="text-[var(--color-text-primary)]">{result.overwritten.observations}</span>
                </div>
              )}
              {result.failed > 0 && (
                <div className="text-[13px]">
                  <span className="text-red-500">✗</span>{' '}
                  <span className="text-[var(--color-secondary)]">{t.dataManagement.failed}:</span>{' '}
                  <span className="text-red-500">{result.failed}</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 p-3">
                <p className="text-[12px] font-medium text-red-700 mb-1">Errors:</p>
                {result.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-[12px] text-red-600">{err}</p>
                ))}
                {result.errors.length > 5 && (
                  <p className="text-[12px] text-red-500">...and {result.errors.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-[14px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            {t.dataManagement.importAnother}
          </button>
        </div>
      )}
    </div>
  );
}
