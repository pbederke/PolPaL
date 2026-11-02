import type { Metadata } from "next";
import EntitiesClient from "./EntitiesClient";

export const metadata: Metadata = {
  title: "Entities",
  description: "Browse all entities covered in the PolPaL database. The initial list of PolPaL entities is based on the core party list of Party Facts, but additional PolPaL entities are added subsequently.",
  alternates: {
    canonical: "/data/entities",
  },
};

export default function EntitiesPage() {
  return <EntitiesClient />;
}
