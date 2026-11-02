import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma.server";
import CountryDetailClient from "./CountryDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ countrycodePolpal: string }> }): Promise<Metadata> {
  const { countrycodePolpal } = await params;
  try {
    const country = await prisma.countries.findUnique({
      where: { countrycodePolpal },
      select: { countryname: true, isHidden: true },
    });
    if (!country || country.isHidden)
      return {
        title: countrycodePolpal,
        description: `PolPaL entities from ${countrycodePolpal} in the PolPaL database.`,
        robots: { index: false },
      };
    return {
      title: `${country.countryname} (${countrycodePolpal})`,
      description: `PolPaL entities from ${country.countryname} in the PolPaL database.`,
      alternates: {
        canonical: `/data/countries/${countrycodePolpal}`,
      },
    };
  } catch {
    return {
      title: countrycodePolpal,
      description: `PolPaL entities from ${countrycodePolpal} in the PolPaL database.`,
      robots: { index: false },
    };
  }
}

export default function CountryDetailPage() {
  return <CountryDetailClient />;
}
