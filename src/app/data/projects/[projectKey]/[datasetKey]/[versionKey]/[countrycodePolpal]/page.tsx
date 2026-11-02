import type { Metadata } from "next";
import VersionCountryClient from "./VersionCountryClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string; datasetKey: string; versionKey: string; countrycodePolpal: string }> }): Promise<Metadata> {
  const { datasetKey, versionKey, countrycodePolpal } = await params;
  return {
    title: `${datasetKey} (${versionKey}) | ${countrycodePolpal}`,
    description: `View the external entity entries for ${countrycodePolpal} in version ${versionKey} of dataset ${datasetKey}.`,
    robots: { index: false },
  };
}

export default function VersionCountryPage() {
  return <VersionCountryClient />;
}
