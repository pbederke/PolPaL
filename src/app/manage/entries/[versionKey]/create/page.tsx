import type { Metadata } from "next";
import { Suspense } from "react";
import CreateEntriesClient from "./CreateEntriesClient";

export async function generateMetadata({ params }: { params: Promise<{ versionKey: string }> }): Promise<Metadata> {
  const { versionKey } = await params;
  return { 
    title: `Import Entries (${versionKey})`,
    description: `Import entries for version ${versionKey} into the PolPaL database.`,
    robots: { index: false },
  };
}

export default function CreateEntriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEntriesClient />
    </Suspense>
  );
}
