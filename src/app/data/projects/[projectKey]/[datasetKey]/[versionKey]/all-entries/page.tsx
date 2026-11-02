import type { Metadata } from "next";
import VersionEntriesClient from "./VersionEntriesClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string; datasetKey: string; versionKey: string }> }): Promise<Metadata> {
  const { versionKey } = await params;
  return { 
    title: `${versionKey} (All Entries)`,
    description: `View all entries for version ${versionKey}.`,
      robots: { index: false },
  };
}

export default function VersionEntriesPage() {
  return <VersionEntriesClient />;
}
