import type { Metadata } from "next";
import EntityInVersionClient from "./EntityInVersionClient";

export async function generateMetadata({ params }: { params: Promise<{ PolPaLId: string; versionKey: string }> }): Promise<Metadata> {
  const { PolPaLId, versionKey } = await params;
  return { 
    title: `Entity ${PolPaLId} – ${versionKey}`,
    description: `View the details of PolPaL entity ${PolPaLId} in version ${versionKey}.`,
    robots: { index: false }
  };
}

export default function EntityInVersionPage() {
  return <EntityInVersionClient />;
}
