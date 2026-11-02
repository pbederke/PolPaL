import { Suspense } from "react";
import type { Metadata } from "next";
import CreateVersionClient from "./CreateVersionClient";

export const metadata: Metadata = {
  title: "Add Version",
  description: "Add a new version to the PolPaL database.",
  robots: { index: false },
};

export default function CreateVersionPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateVersionClient />
    </Suspense>
  );
}
