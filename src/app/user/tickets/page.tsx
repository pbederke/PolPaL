import { Suspense } from 'react';
import type { Metadata } from 'next';
import TicketsClient from './TicketsClient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Open Tickets',
  description: 'Browse all open tickets created by the user in the PolPaL database.',
  robots: { index: false },
};

export default function TicketsPage() {
  return (
    <Suspense fallback={<LoadingSpinner title="Loading tickets..." />}>
      <TicketsClient />
    </Suspense>
  );
}
