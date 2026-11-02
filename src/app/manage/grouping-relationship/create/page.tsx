import { Suspense } from "react";
import type { Metadata } from "next";
import CreateGroupingRelationshipClient from "./CreateGroupingRelationshipClient";

export const metadata: Metadata = {
  title: "Add Grouping Relationship",
  description: "Add a new grouping relationship to the PolPaL database.",
  robots: { index: false },
};

export default function CreateGroupingRelationshipPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateGroupingRelationshipClient />
    </Suspense>
  );
}