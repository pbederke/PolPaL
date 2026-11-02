import { Suspense } from "react";
import type { Metadata } from "next";
import CreateEntityNameClient from "./CreateEntityNameClient";

export const metadata: Metadata = {
  title: "Add Entity Names",
  description: "Add new entity names to an entity in the PolPaL database.",
  robots: { index: false },
};

export default function CreateEntityNamePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEntityNameClient />
    </Suspense>
  );
}