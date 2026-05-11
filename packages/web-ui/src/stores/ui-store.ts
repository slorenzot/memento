import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Locale, LOCALE_COOKIE, DEFAULT_LOCALE } from '@/i18n/config';

export type Theme = 'light' | 'dark' | 'system';

interface UIState {
  sidebarCollapsed: boolean;
  theme: Theme;
  locale: Locale;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
}

function syncLocaleCookie(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${365 * 86400};samesite=lax`;
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      locale: DEFAULT_LOCALE,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => {
        syncLocaleCookie(locale);
        set({ locale });
      },
    }),
    {
      name: 'memento-ui',
      // Only persist these fields
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        locale: state.locale,
      }),
    },
  ),
);

/**
 * Resolve the effective theme (light or dark) from the user's preference.
 * - 'dark' → dark
 * - 'light' → light
 * - 'system' → check window.matchMedia('(prefers-color-scheme: dark)')
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'dark'; // SSR default
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
