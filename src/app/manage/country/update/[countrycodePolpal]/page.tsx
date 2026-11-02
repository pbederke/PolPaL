import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateCountryClient from "./UpdateCountryClient";

export async function generateMetadata({ params }: { params: Promise<{ countrycodePolpal: string }> }): Promise<Metadata> {
  const { countrycodePolpal } = await params;
  return { 
    title: `Update Country ${countrycodePolpal}`,
    description: `Update the details of country ${countrycodePolpal} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateCountryPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateCountryClient />
    </Suspense>
  );
}
