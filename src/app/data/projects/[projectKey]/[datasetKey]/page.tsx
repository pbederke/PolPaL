import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma.server";
import DatasetDetailClient from "./DatasetDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string; datasetKey: string }> }): Promise<Metadata> {
  const { projectKey, datasetKey } = await params;
  try {
    const dataset = await prisma.datasets.findUnique({
      where: { datasetKey },
      select: { datasetName: true, datasetNameShort: true, isHidden: true },
    });
    if (!dataset || dataset.isHidden) 
      return { 
        title: `Dataset ${datasetKey}`,
        description: `View the details for dataset ${datasetKey} in project ${projectKey}.`,
        robots: { index: false }
      };
    return {
      title: `${dataset.datasetName} (${dataset.datasetNameShort})`,
      description: `View the details for dataset ${dataset.datasetName} in project ${projectKey}.`,
      alternates: {
        canonical: `/data/projects/${projectKey}/${datasetKey}`,
      }
    };
  } catch {
    return { 
      title: `Dataset ${datasetKey}`,
      description: `View the details for dataset ${datasetKey} in project ${projectKey}.`,
      robots: { index: false },
    };
  }
}

export default function DatasetDetailPage() {
  return <DatasetDetailClient />;
}
