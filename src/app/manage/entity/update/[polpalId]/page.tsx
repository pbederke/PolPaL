import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateEntityClient from "./UpdateEntityClient";

export async function generateMetadata({ params }: { params: Promise<{ polpalId: string }> }): Promise<Metadata> {
  const { polpalId } = await params;
  return { 
    title: `Update Entity ${polpalId}`,
    description: `Update the details of entity ${polpalId} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateEntityPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateEntityClient />
    </Suspense>
  );
}
