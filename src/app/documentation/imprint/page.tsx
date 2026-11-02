import type { Metadata } from "next";
import ImprintClient from "./ImprintClient";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Legal imprint for the PolPaL platform.",
  robots: { index: false },
};

export default function ImprintPage() {
  return <ImprintClient />;
}
