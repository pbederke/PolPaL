import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateDatasetClient from "./UpdateDatasetClient";

export async function generateMetadata({ params }: { params: Promise<{ datasetKey: string }> }): Promise<Metadata> {
  const { datasetKey } = await params;
  return { 
    title: `Update Dataset ${datasetKey}`,
    description: `Update the details of dataset ${datasetKey} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateDatasetPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateDatasetClient />
    </Suspense>
  );
}
