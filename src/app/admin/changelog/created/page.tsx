import type { Metadata } from "next";
import AdminChangelogSectionClient from "../AdminChangelogSectionClient";

export const metadata: Metadata = { title: "Changelog – Created" };

export default function AdminChangelogCreatedPage() {
  return <AdminChangelogSectionClient action="created" />;
}
