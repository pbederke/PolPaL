import type { Metadata } from "next";
import LinkingVersionClient from "./LinkingVersionClient";

export async function generateMetadata({ params }: { params: Promise<{ versionKey: string }> }): Promise<Metadata> {
  const { versionKey } = await params;
  return { 
    title: `Linking ${versionKey}`,
    description: `View the linking overview for version ${versionKey}.`,
  };
}

export default function LinkingVersionPage() {
  return <LinkingVersionClient />;
}
