import type { Metadata } from "next";
import UnassignedEntitiesClient from "./UnassignedEntitiesClient";

export const metadata: Metadata = {
  title: "Unassigned Entities",
  description: "Browse all PolPaL entities that are not assigned an entity type.",
  robots: { index: false },
};

export default function UnassignedEntitiesPage() {
  return <UnassignedEntitiesClient />;
}
