import type { Metadata } from "next";
import CodebookClient from "./CodebookClient";

export const metadata: Metadata = {
  title: "Codebook",
  description: "The PolPaL codebook: variable definitions, entity types, and data structure documentation.",
  alternates: {
    canonical: "/documentation/codebook",
  },
};

export default function CodebookPage() {
  return <CodebookClient />;
}
