import type { Metadata } from "next";
import QualityChecksClient from "./QualityChecksClient";

export const metadata: Metadata = {
  title: "Quality Checks",
  description: "Browse the quality checks for the PolPaL database.",
  robots: { index: false },
};

export default function QualityChecksPage() {
  return <QualityChecksClient />;
}
