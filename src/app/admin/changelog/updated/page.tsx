import type { Metadata } from "next";
import AdminChangelogSectionClient from "../AdminChangelogSectionClient";

export const metadata: Metadata = { title: "Changelog – Updated" };

export default function AdminChangelogUpdatedPage() {
  return <AdminChangelogSectionClient action="updated" />;
}
