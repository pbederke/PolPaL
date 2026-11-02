import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateProjectClient from "./UpdateProjectClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  return { 
    title: `Update Project ${projectKey}`,
    description: `Update the details of project ${projectKey} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateProjectPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateProjectClient />
    </Suspense>
  );
}
