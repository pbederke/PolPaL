import type { Metadata } from "next";
import EntryDetailClient from "./EntryDetailClient";

export const metadata: Metadata = {
  title: "Entry Detail",
  description: "View the details of a specific external entity entry in the PolPaL database.",
  robots: { index: false },
};

export default function EntryDetailPage() {
  return <EntryDetailClient />;
}
