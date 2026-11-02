import type { Metadata } from "next";
import HiddenEntitiesClient from "./HiddenEntitiesClient";

export const metadata: Metadata = {
  title: "Hidden Entities",
  description: "Browse all PolPaL entities that are set as <HIDDEN>.",
  robots: { index: false },
};

export default function HiddenEntitiesPage() {
  return <HiddenEntitiesClient />;
}
