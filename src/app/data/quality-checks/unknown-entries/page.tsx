import type { Metadata } from "next";
import UnknownEntriesClient from "./UnknownEntriesClient";

export const metadata: Metadata = {
  title: "Unknown Entries",
  description: "Browse all PolPaL entities that are assigned to the special PolPaL entity <UNKNOWN>.",
  robots: { index: false },
};

export default function UnknownEntriesPage() {
  return <UnknownEntriesClient />;
}
