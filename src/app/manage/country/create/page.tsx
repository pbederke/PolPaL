import { Suspense } from "react";
import type { Metadata } from "next";
import CreateCountryClient from "./CreateCountryClient";

export const metadata: Metadata = {
  title: "Add Country",
  description: "Add a new country to the PolPaL database.",
  robots: { index: false },
};

export default function CreateCountryPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateCountryClient />
    </Suspense>
  );
}
