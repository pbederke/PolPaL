import type { Metadata } from "next";
import LinkingCountryClient from "./LinkingCountryClient";

export async function generateMetadata({ params }: { params: Promise<{ versionKey: string; countrycodePolpal: string }> }): Promise<Metadata> {
  const { versionKey, countrycodePolpal } = await params;
  return { 
    title: `Linking ${versionKey} | ${countrycodePolpal}`,
    description: `Linking interface tool for ${countrycodePolpal} in version ${versionKey}.`,
  };
}

export default function LinkingCountryPage() {
  return <LinkingCountryClient />;
}
