import { Suspense } from "react";
import type { Metadata } from "next";
import LinkingOverviewClient from "./LinkingOverviewClient";

export const metadata: Metadata = {
  title: "Linking Overview",
  description: "Linking overview: status of linking across datasets and versions.",
  robots: { index: false },
};

export default function LinkingOverviewPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <LinkingOverviewClient />
    </Suspense>
  );
}