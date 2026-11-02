import type { Metadata } from "next";
import ProjectsClient from "./ProjectsClient";

export const metadata: Metadata = {
  title: "Projects",
  description: "Browse all research projects and datasets linked in the PolPaL database.",
  alternates: {
    canonical: "/data/projects",
  },
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
