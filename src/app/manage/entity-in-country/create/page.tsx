import { Suspense } from "react";
import type { Metadata } from "next";
import CreateEntityInCountryClient from "./CreateEntityInCountryClient";

export const metadata: Metadata = {
  title: "Add Countries to Entity",
  description: "Add new countries to an entity in the PolPaL database.",
  robots: { index: false },
};

export default function CreateEntityInCountryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEntityInCountryClient />
    </Suspense>
  );
}