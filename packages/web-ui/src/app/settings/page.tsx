'use client';

import { useUIStore, type Theme } from '@/stores/ui-store';
import { useT } from '@/i18n/translation-context';

export default function SettingsPage() {
  const t = useT();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const themeOptions: { value: Theme; label: string; description: string }[] = [
    { value: 'system', label: t.settings.system, description: t.settings.systemDescription },
    { value: 'dark', label: t.settings.dark, description: t.settings.darkDescription },
    { value: 'light', label: t.settings.light, description: t.settings.lightDescription },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
        {t.settings.title}
      </h1>

      {/* Appearance section */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
          {t.settings.appearance}
        </h2>

        <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
          <h3 className="text-[14px] font-medium text-[var(--color-text-primary)]">
            {t.settings.theme}
          </h3>
          <p className="text-[13px] text-[var(--color-secondary)]">
            {t.settings.themeDescription}
          </p>

          <div className="grid gap-2 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  theme === option.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface-hover)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 rounded-full border-2 ${
                      theme === option.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                        : 'border-[var(--color-border)]'
                    }`}
                  />
                  <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                    {option.label}
                  </span>
                </div>
                <p className="mt-1 pl-5 text-[12px] text-[var(--color-tertiary)]">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
