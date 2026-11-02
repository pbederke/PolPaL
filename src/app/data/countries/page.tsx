import type { Metadata } from "next";
import CountriesClient from "./CountriesClient";

export const metadata: Metadata = {
  title: "Countries",
  description: "Browse all countries included in the PolPaL database.",
  alternates: {
    canonical: "/data/countries"
  }
};

export default function CountriesPage() {
  return <CountriesClient />;
}
