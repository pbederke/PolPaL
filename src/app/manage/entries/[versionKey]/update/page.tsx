import type { Metadata } from "next";
import UpdateEntriesClient from "./UpdateEntriesClient";

export async function generateMetadata({ params }: { params: Promise<{ versionKey: string }> }): Promise<Metadata> {
  const { versionKey } = await params;
  return { 
    title: `Update Entries (${versionKey})`,
    description: `Update entries for version ${versionKey} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateEntriesPage() {
  return <UpdateEntriesClient />;
}
