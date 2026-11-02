import type { Metadata } from "next";
import { prisma } from "@/lib/server/prisma.server";
import ProjectDetailClient from "./ProjectDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  try {
    const project = await prisma.projects.findUnique({
      where: { projectKey },
      select: { projectName: true, projectNameShort: true, isHidden: true },
    });
    if (!project || project.isHidden) return { title: `Project ${projectKey}`, robots: { index: false } };
    return {
      title: `${project.projectName} (${project.projectNameShort})`,
      description: `View the details for project ${project.projectName}.`,
      alternates: {
        canonical: `/data/projects/${projectKey}`,
      },
    };
  } catch {
    return { 
      title: `Project ${projectKey}`,
      description: `View the details for project ${projectKey}.`,
      robots: { index: false }
    };
  }
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
