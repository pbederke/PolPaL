import type { Metadata } from "next";
import DataProtectionClient from "./DataProtectionClient";

export const metadata: Metadata = {
  title: "Data Protection",
  description: "PolPaL data protection and privacy policy.",
  robots: { index: false },
};

export default function DataProtectionPage() {
  return <DataProtectionClient />;
}
