import { Suspense } from 'react';
import { SearchPage } from '@/components/search/SearchPage';

export default function LangSearchRoute() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
