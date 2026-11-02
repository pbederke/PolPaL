import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateVersionClient from "./UpdateVersionClient";

export async function generateMetadata({ params }: { params: Promise<{ versionKey: string }> }): Promise<Metadata> {
  const { versionKey } = await params;
  return { 
    title: `Update Version ${versionKey}`,
    description: `Update the details of version ${versionKey} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateVersionPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateVersionClient />
    </Suspense>
  );
}
