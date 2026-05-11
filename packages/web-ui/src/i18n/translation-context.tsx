'use client';

/**
 * Client-side translation context.
 *
 * Receives the dictionary from a parent Server Component via props,
 * provides it to all Client Components via `useT()` hook.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Dictionary } from './get-dictionary';
import en from './locales/en.json';

const TranslationContext = createContext<Dictionary>(en);

export function TranslationProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <TranslationContext.Provider value={dictionary}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access the translation dictionary in Client Components.
 *
 * Usage:
 * ```tsx
 * const t = useT();
 * return <h1>{t.observations.title}</h1>
 * ```
 */
export function useT(): Dictionary {
  return useContext(TranslationContext);
}
