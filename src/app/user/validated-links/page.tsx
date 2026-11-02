import { Suspense } from 'react';
import type { Metadata } from 'next';
import ValidatedLinksClient from './ValidatedLinksClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Validated Links',
  description: 'Browse all validated links created by the user in the PolPaL database.',
  robots: { index: false },
};

export default function ValidatedLinksPage() {
  return (
    <Suspense fallback={<LoadingSpinner title="Loading validated links..." />}>
      <ValidatedLinksClient />
    </Suspense>
  );
}
