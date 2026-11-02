import { Suspense } from 'react';
import type { Metadata } from 'next';
import LinkedEntitiesClient from './LinkedEntitiesClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Created Links',
  description: 'Browse all links created by the user in the PolPaL database.',
  robots: { index: false },
};

export default function LinkedEntitiesPage() {
  return (
    <Suspense fallback={<LoadingSpinner title="Loading links..." />}>
      <LinkedEntitiesClient />
    </Suspense>
  );
}
