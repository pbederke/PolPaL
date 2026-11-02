import type { Metadata } from "next";
import ContributeClient from "./ContributeClient";

export const metadata: Metadata = {
  title: "Contribute",
  description: "How to participate and contribute to PolPaL.",
  alternates: {
    canonical: "/documentation/contribute",
  },
};

export default function ContributePage() {
  return <ContributeClient />;
}
