import { Suspense } from "react";
import type { Metadata } from "next";
import CreateProjectClient from "./CreateProjectClient";

export const metadata: Metadata = {
  title: "Add Project",
  description: "Add a new project to the PolPaL database.",
  robots: { index: false },
};

export default function CreateProjectPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateProjectClient />
    </Suspense>
  );
}
