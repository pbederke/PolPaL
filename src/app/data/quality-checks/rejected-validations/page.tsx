import type { Metadata } from "next";
import RejectedValidationsClient from "./RejectedValidationsClient";

export const metadata: Metadata = {
  title: "Rejected Validations",
  description: "Browse all links that have rejected validations.",
  robots: { index: false },
};

export default function RejectedValidationsPage() {
  return <RejectedValidationsClient />;
}
