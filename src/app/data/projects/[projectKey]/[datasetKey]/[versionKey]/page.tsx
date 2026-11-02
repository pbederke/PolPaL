import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma.server";
import VersionDetailClient from "./VersionDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string; datasetKey: string; versionKey: string }> }): Promise<Metadata> {
  const { projectKey, datasetKey, versionKey } = await params;
  try {
    const [version, dataset, project] = await Promise.all([
      prisma.versions.findUnique({
        where: { versionKey },
        select: { version: true },
      }),
      prisma.datasets.findUnique({
        where: { datasetKey },
        select: { datasetNameShort: true },
      }),
      prisma.projects.findUnique({
        where: { projectKey },
        select: { projectNameShort: true },
      }),
    ]);
    if (!version)
      return {
        title: `${projectKey} - ${datasetKey} (${versionKey})`,
        description: `View the details for version ${versionKey} of dataset ${datasetKey} in project ${projectKey}.`,
        robots: { index: false }
      };
    const versionLabel = version.version ?? versionKey;
    const datasetLabel = dataset?.datasetNameShort ?? datasetKey;
    const projectLabel = project?.projectNameShort ?? projectKey;
    return {
      title: `${projectLabel} - ${datasetLabel} (${versionLabel})`,
      description: `View the details for version ${versionLabel} of dataset ${datasetLabel} in project ${projectLabel}.`,
      alternates: {
        canonical: `/data/projects/${projectKey}/${datasetKey}/${versionKey}`,
      }
    };
  } catch {
    return {
      title: `${projectKey} - ${datasetKey} (${versionKey})`,
      description: `View the details for version ${versionKey} of dataset ${datasetKey} in project ${projectKey}.`,
      robots: { index: false },
    };
  }
}

export default function VersionDetailPage() {
  return <VersionDetailClient />;
}
