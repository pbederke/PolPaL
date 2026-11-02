import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma.server";
import EntityDetailClient from "./EntityDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ PolPaLId: string }> }): Promise<Metadata> {
  const { PolPaLId } = await params;
  try {
    const entity = await prisma.entities.findUnique({
      where: { polpalId: parseInt(PolPaLId, 10) },
      select: { nameShort: true, nameEnglish: true, isHidden: true },
    });
    if (!entity || entity.isHidden)
      return {
        title: `Entity ${PolPaLId}`,
        robots: { index: false }
      };
    return {
      title: `${entity.nameShort} (${PolPaLId})`,
      description: `PolPaL entity page for ${entity.nameEnglish} in the PolPaL database.`,
      alternates: {
        canonical: `/data/entities/${PolPaLId}`,
      },
    };
  } catch {
    return {
      title: `Entity ${PolPaLId}`,
      description: `PolPaL entity profile for entity ${PolPaLId} in the PolPaL database.`,
      robots: { index: false }
    };
  }
}

export default function EntityDetailPage() {
  return <EntityDetailClient />;
}
