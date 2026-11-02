import { Suspense } from 'react';
import type { Metadata } from 'next';
import CreatedEntitiesClient from './CreatedEntitiesClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Created Entities',
  description: 'Browse all entities created by the user in the PolPaL database.',
  robots: { index: false },
};

export default function CreatedEntitiesPage() {
  return (
    <Suspense fallback={<LoadingSpinner title="Loading entities..." />}>
      <CreatedEntitiesClient />
    </Suspense>
  );
}
