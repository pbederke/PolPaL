import type { Metadata } from "next";
import MissingCountriesClient from "./MissingCountriesClient";

export const metadata: Metadata = {
  title: "Entities Without Country Assignment",
  description: "Browse all PolPaL entities that are not assigned to any country in the PolPaL database.",
  robots: { index: false },
};

export default function MissingCountriesPage() {
  return <MissingCountriesClient />;
}
