import { Suspense } from "react";
import type { Metadata } from "next";
import CreateEntityChangeClient from "./CreateEntityChangeClient";

export const metadata: Metadata = {
  title: "Add Entity Change",
  description: "Add a new entity change to the PolPaL database.",
  robots: { index: false },
};

export default function CreateEntityChangePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEntityChangeClient />
    </Suspense>
  );
}