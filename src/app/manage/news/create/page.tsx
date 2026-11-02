import { Suspense } from "react";
import type { Metadata } from "next";
import CreateNewsClient from "./CreateNewsClient";

export const metadata: Metadata = {
  title: "Add News Entry",
  description: "Add a new news entry to the PolPaL database.",
  robots: { index: false },
};

export default function CreateVersionPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateNewsClient />
    </Suspense>
  );
}
