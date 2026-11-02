import type { Metadata } from "next";
import WorkingOnClient from "./WorkingOnClient";

export const metadata: Metadata = {
  title: "Work in Progress",
  description: "An overview of the data and features currently being developed at PolPaL.",
  alternates: {
    canonical: "/documentation/working-on",
  },
};

export default function WorkingOnPage() {
  return <WorkingOnClient />;
}
