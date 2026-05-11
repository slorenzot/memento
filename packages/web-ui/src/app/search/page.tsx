import { Suspense } from 'react';
import { SearchPage } from '@/components/search/SearchPage';

export default function SearchRoute() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
