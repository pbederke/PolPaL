import { Suspense } from "react";
import type { Metadata } from "next";
import CreateDatasetClient from "./CreateDatasetClient";

export const metadata: Metadata = {
  title: "Add Dataset",
  description: "Add a new dataset to the PolPaL database.",
  robots: { index: false },
};

export default function CreateDatasetPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateDatasetClient />
    </Suspense>
  );
}
