import { Suspense } from "react";
import type { Metadata } from "next";
import CreateEntityClient from "./CreateEntityClient";

export const metadata: Metadata = {
  title: "Add PolPaL entity",
  description: "Add a new PolPaL entity to the PolPaL database.",
  robots: { index: false },
};

export default function CreateEntityPage() {
  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateEntityClient />
    </Suspense>
  );
}